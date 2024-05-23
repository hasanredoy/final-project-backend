const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookie());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.2xfw1xu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const menuCollection = client.db("menuDB").collection("menu");
    const usersCollection = client.db("menuDB").collection("users");
    const reviewsCollection = client.db("menuDB").collection("reviews");
    const cartsCollection = client.db("menuDB").collection("cart");
     
// jwt related apis 
app.post('/jwt', async (req,res)=>{
  const user = req.body
  console.log('email while login', user?.email);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'} )
  res.send({token})
})

// verify admin 
const verifyAdmin =async (req,res,next)=>{
   const email = req?.decoded.email
   const query = { email: email}
   const user = await usersCollection.findOne(query)
   const isAdmin = user?.role === 'admin'
   if(!isAdmin){
    return res.status(403).send({message:'forbidden access'})
   }
  next()
}

// middlewares
const verify = (req,res,next)=>{
  
  console.log('header-->',req.headers.authorization);
  if(!req.headers.authorization){
    return res.status(401).send({message:'unauthorized'})
  }
  const token = req?.headers?.authorization.split(' ')[1]
  console.log( "token is", token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
    if(err){
      return res.status(401).message('unauthorized')
    }
    req.decoded=decoded;
    next()
  })
}

    // users related api
    app.get("/users",verify,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email' , verify,async(req,res)=>{
      const email = req.params.email;
      console.log('email is',email);
      console.log('decoded email ',req.decoded.email);
      if(email !== req.decoded.email){
        return res.status(403).send({message:'forbiden'})
      }

      const query = {email : email}
      const user = await usersCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})
    })


    app.post("/users", async (req, res) => {
      const userData = req.body;
      // checking that users email is already exist in data base or not
      const query = { email: userData.email };
      const findUserEmail = await usersCollection.findOne(query);

      if (findUserEmail) {
        return res.send({
          message: "user email already exists",
          insertedId: null,
        });
      }

      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // menu api
    app.get("/menu", async (req, res) => {
      let query = {};
      if (req.query.category) {
        query = { category: req.query.category };
      }
      const size = parseInt(req?.query?.size);
      const page = parseInt(req?.query?.page);
      console.log(req.query.size, req.query.page);
      const getData = await menuCollection
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();

      res.send(getData);
    });
    // review api
    app.get("/reviews", async (req, res) => {
      const getData = await reviewsCollection.find().toArray();
      res.send(getData);
    });

    //  carts api
    app.get("/cart", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/cart", async (req, res) => {
      const data = req.body;
      const result = await cartsCollection.insertOne(data);
      res.send(result);
    });
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("bistro boss is running");
});

app.listen(port, () => {
  console.log("port is running on :", port);
});
