const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

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
    await client.connect();
    const carRentalDB = client.db("carRentalDB");
    const carsCollection = carRentalDB.collection("carsCollection");

    // Create a new car rent
    app.post("/newCar", async (req, res) => {
      const newCar = req.body;
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
    });

    // Get all cars rent
    app.get("/allCars", async (req, res) => {
      const projectFields = {
        carName: 1,
        rentPrice: 1,
        carCategory: 1,
        carImageUrl: 1,
        ratings: 1,
        status: 1,
        providerName: 1,
      };
      const cursor = carsCollection.find().project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get hero slider car rent
    app.get("/heroSlider", async (req, res) => {
      const projectFields = {
        carName: 1,
        carImageUrl: 1,
        carDesc: 1,
      };
      const query = { status: true };
      const cursor = carsCollection.find(query).limit(5).project(projectFields);
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
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.findOne(query);
      res.send(result);
    });

    // Get car by email
    app.get("/myListings/:email", async (req, res) => {
      const email = req.params.email;
      const query = { providerEmail: email };
      const projectFields = {
        carDesc: 0,
        providerName: 0,
        providerEmail: 0,
        location: 0,
        createdAt: 0,
      };
      const cursor = carsCollection.find(query).project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running in http://localhost:${port}`);
});
