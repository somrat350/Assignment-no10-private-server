const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

app.get("/",(req,res)=>{
  res.send("Hello")
})

app.listen(port, () => {
  console.log(`Server running in http://localhost:${port}`);
});
