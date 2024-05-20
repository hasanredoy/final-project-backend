const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookie = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT ||5000

const app =express()

app.use(express.json())
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(cookie())



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.2xfw1xu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const menuCollection = client.db('menuDB').collection('menu')
    const reviewsCollection = client.db('menuDB').collection('reviews')
    const cartsCollection = client.db('menuDB').collection('cart')
// menu api 
 app.get('/menu', async(req,res)=>{
  let query = {}
  if(req.query.category){
    query={category: req.query.category}
  }
  const size = parseInt(req?.query?.size)
  const page = parseInt(req?.query?.page)
  console.log(req.query.size,req.query.page);
  const getData = await menuCollection.find(query).skip(size*page).limit(size).
  toArray()
 
  res.send(getData)
 })
// review api 
 app.get('/reviews', async(req,res)=>{
  const getData = await reviewsCollection.find().toArray()
  res.send(getData)
 })

//  carts api 
app.get('/cart',async(req,res)=>{
  const userEmail = req.query.email
  const query = {email: userEmail}
  const result = await cartsCollection.find(query).toArray()
  res.send(result)
})
app.post('/cart',async(req,res)=>{
  const data = req.body
  const result = await cartsCollection.insertOne(data)
  res.send(result)
})
app.delete('/cart/:id',async(req,res)=>{
  const id = req.params.id
  const filter = {_id:new ObjectId(id)}
  const result = await cartsCollection.deleteOne(filter)
  res.send(result)
})
  } finally {
  
  }
}
run().catch(console.dir);




app.get('/', (req,res)=>{
  res.send('bistro boss is running')
})

app.listen(port, ()=>{
  console.log('port is running on :' , port);
})
