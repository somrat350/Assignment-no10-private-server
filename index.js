const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Firebase admin services setting
const admin = require("firebase-admin");
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

const port = process.env.PORT || 3000;
const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(express.json());
app.use(cors());

// Custom middleware
const verifyFirebaseToken = async (req, res, next) => {
  const authorizationText = req.headers.authorization;
  if (!authorizationText) {
    return res.status(401).send({ message: "unauthorize access!" });
  }
  const token = authorizationText.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorize access!" });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.tokenEmail = userInfo.email;
    next();
  } catch {
    return res.status(401).send({ message: "unauthorize access!" });
  }
};

const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@cluster0.lechzdi.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const carRentalDB = client.db("carRentalDB");
    const usersCollection = carRentalDB.collection("usersCollection");
    const carsCollection = carRentalDB.collection("carsCollection");
    const bookingsCollection = carRentalDB.collection("bookingsCollection");

    // create new user
    app.post("/newUser", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const exist = await usersCollection.findOne(query);
      if (exist) return res.send({ message: "user already exist." });

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // update user
    app.put("/updateProfile", verifyFirebaseToken, async (req, res) => {
      const { email } = req.query;
      const updatedData = req.body;
      const query = { email };
      if (updatedData._id) {
        delete updatedData._id;
      }
      const result = await usersCollection.updateOne(query, {
        $set: updatedData,
      });
      res.send(result);
    });

    // get current user
    app.get("/currentUser", verifyFirebaseToken, async (req, res) => {
      const { email } = req.query;
      const { tokenEmail } = req;
      if (!email && email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access!" });
      }
      const query = { email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Create a new car rent
    app.post("/newCar", verifyFirebaseToken, async (req, res) => {
      const newCar = req.body;
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
    });

    // Create a new booking
    app.post("/newBooking", verifyFirebaseToken, async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    // Get booked car by email
    app.get("/myBookings/:email", verifyFirebaseToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.tokenEmail) {
        return res.status(403).send({ message: "forbidden access!" });
      }
      const query = { bookingEmail: email };
      const projectFields = {
        carId: 1,
        carImageUrl: 1,
        carCategory: 1,
        carName: 1,
        rentPrice: 1,
      };
      const cursor = bookingsCollection.find(query).project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Update car details
    app.patch("/updateCar/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updateCar = req.body;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.updateOne(query, { $set: updateCar });
      res.send(result);
    });

    // Delete a car by id
    app.delete("/deleteCar/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.send(result);
    });

    // Delete booked car by id
    app.delete(
      "/deleteBookedCar/:id",
      verifyFirebaseToken,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
      }
    );

    // Get all cars rent
    app.get("/allCars", async (req, res) => {
      const { limit = 0, skip = 0, src } = req.query;
      const limitNumber = parseInt(limit);
      const skipNumber = parseInt(skip);
      const query = {};
      if (src !== "") {
        query.$or = [
          { carName: { $regex: src, $options: "i" } },
          { carCategory: { $regex: src, $options: "i" } },
          { status: { $regex: src, $options: "i" } },
        ];
      }
      const projectFields = {
        carName: 1,
        rentPrice: 1,
        carCategory: 1,
        carImageUrl: 1,
        ratings: 1,
        status: 1,
        providerName: 1,
      };
      const cursor = carsCollection
        .find(query)
        .skip(skipNumber)
        .limit(limitNumber)
        .project(projectFields);
      const result = await cursor.toArray();
      const total = await carsCollection.countDocuments(query);
      res.send({ result, total });
    });

    // Get hero slider car rent
    app.get("/heroSlider", async (req, res) => {
      const projectFields = {
        carName: 1,
        carImageUrl: 1,
        carDesc: 1,
      };
      const sortBy = { ratings: -1 };
      const cursor = carsCollection
        .find()
        .sort(sortBy)
        .limit(5)
        .project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get newest car rent
    app.get("/newestCars", async (req, res) => {
      const projectFields = {
        carName: 1,
        rentPrice: 1,
        carCategory: 1,
        carImageUrl: 1,
        ratings: 1,
        status: 1,
        providerName: 1,
      };
      const query = { createdAt: -1 };
      const cursor = carsCollection
        .find()
        .sort(query)
        .limit(6)
        .project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get top rated car rent
    app.get("/topRatedCars", async (req, res) => {
      const projectFields = {
        carName: 1,
        rentPrice: 1,
        carCategory: 1,
        carImageUrl: 1,
        ratings: 1,
        status: 1,
        providerName: 1,
      };
      const query = { ratings: -1 };
      const cursor = carsCollection
        .find()
        .sort(query)
        .limit(6)
        .project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get one single car rent
    app.get("/car/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.send(null);
      }
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.findOne(query);
      res.send(result);
    });

    // Get car by email
    app.get("/myListings/:email", verifyFirebaseToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.tokenEmail) {
        return res.status(403).send({ message: "forbidden access!" });
      }
      const { limit = 0, page = 1, status, search } = req.query;
      const query = { providerEmail: email };
      if (status !== "all") {
        query.status = status === "available";
      }

      if (search) {
        query.carName = { $regex: search, $options: "i" };
      }
      const skip = (page - 1) * limit;
      const projectFields = {
        carDesc: 0,
        providerName: 0,
        providerEmail: 0,
        location: 0,
        createdAt: 0,
      };
      const cursor = carsCollection
        .find(query)
        .skip(skip)
        .limit(Number(limit))
        .project(projectFields);
      const result = await cursor.toArray();
      const total = await carsCollection.countDocuments(query);
      res.send({ result, total });
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running successfully.");
});

app.listen(port, () => {
  console.log(`Server running in port : ${port}`);
});
