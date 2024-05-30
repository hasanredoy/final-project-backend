const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ['https://bistro-boss-ccbed.web.app','https://bistro-boss-ccbed.web.app'],
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
    const paymentsCollection = client.db("menuDB").collection("payments");
     
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
     
      const getData = await menuCollection
        .find(query)
        .toArray();

      res.send(getData);
    });

    // posting on menu db 
    app.post('/menu',verifyAdmin, async(req,res)=>{
      const menuData = req.body;
      const result = await menuCollection.insertOne(menuData)
      res.send(result)
    })
  // deleting an item from menu 
  app.delete('/menu/:id', verify,verifyAdmin,async(req,res)=>{
    const id = req.params.id;
    console.log("id for deleting menu item",id);
    const filter= {_id : id}
    const query= {_id :new ObjectId(id)}
    const result = await menuCollection.deleteOne(filter||query)
    res.send(result)
  })
  // getting an item from menu 
  app.get('/menu/:id', async(req,res)=>{
    const id = req.params.id;
    console.log("id for deleting menu item",id);
    const filter= {_id : id}
    const query= {_id :new ObjectId(id)}
    const result = await menuCollection.findOne(filter||query)
    res.send(result)
  })
  // updating an item from menu 
  app.patch('/menu/:id', async(req,res)=>{
    const id = req.params.id;
    const formData = req.body
    console.log("id for deleting menu item",id);
    const filter= {_id : id}
    const query= {_id :new ObjectId(id)}
    const data = {
      $set:{
        name : formData.name, 
        price : formData.price, 
        category : formData.category, 
        recipe : formData.recipe, 
        image : formData.image, 
      }
    }
    const result = await menuCollection.updateOne(filter||query,data)
    res.send(result)
  })


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


    // payments intent 
    app.post(`/create-payment-intent`,async (req,res)=>{
      const {price}=req.body
      const amount = parseInt(price*100) 
      
      console.log('amount==>',amount);
      const paymentIntent =await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types: [
          "card"
        ],

      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    // geting user payment  
    app.get('/payments/:email',verify,async(req,res)=>{
      const query ={email : req?.params?.email}
     console.log('users email==> ',req?.params?.email ,' decoded email ===>',req.decoded.email)
     if(req.decoded?.email !== req?.params?.email ){
      return res.status(400).send({message:'forbidden'})
     }

      const result =await paymentsCollection.find(query).toArray()
      res.send(result)
    })
    // posting user payment info after successful payment 
    app.post('/payments',async(req,res)=>{
      const payment = req.body
      console.log(payment);
      const paymentResult =await paymentsCollection.insertOne(payment)

  // carefully delete carts data after payment 
   const query={_id:{
    $in : payment.cartIds.map(id=> new ObjectId(id))
   }}
   const deleteResult= await cartsCollection.deleteMany(query)

      res.send({paymentResult,deleteResult})
    })

  //  admin stats 
  app.get('/admin-stats' ,verify,verifyAdmin, async(req,res)=>{
    const users= await usersCollection.estimatedDocumentCount()
    const menuItems = await menuCollection.estimatedDocumentCount()
    const orders= await paymentsCollection.estimatedDocumentCount()


    // counting all revenue from paymentsCollection in normal way 
    // const payment = await paymentsCollection.find().toArray()
    // const revenue = payment.reduce((previous,present)=> previous + present.price,0)

    // calculating sum in best way 
    const result = await paymentsCollection.aggregate([{
      $group:{
        _id:null,
        totalRevenue:{
          $sum:'$price'
        }
      }
    }]).toArray()
   
    const revenue = result.length>0?result[0].totalRevenue:0

    res.send({
      users,
      menuItems,
      orders,
      revenue
    })
  })


  // using aggregate to get orders stats by pipeline
  app.get('/order-stats',verify,verifyAdmin,async(req,res)=>{
    const result = await paymentsCollection.aggregate([
      {
        $unwind:"$menuIds"
      },
      {
        $lookup:{
          from:'menu',
          localField:'menuIds',
          foreignField:'_id',
          as:'menuItems'
        }
      },
    {
      $unwind:'$menuItems'
    },
  {
    $group:{
      _id:'$menuItems.category',
      quantity:{
        $sum:1
      },
      revenue:{
        $sum: '$menuItems.price'
      }
    }
  },
  {
    $project:{
     _id:0,
     category:"$_id",
     quantity:'$quantity',
     revenue:"$revenue"
    }
  }
    ]).toArray()
    res.send(result)
  })


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
