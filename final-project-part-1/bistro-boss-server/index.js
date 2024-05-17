const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookie = require('cookie-parser')
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT ||5000

const app =express()

app.use(express.json())
app.use(cors())
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

 app.get('/menu', async(req,res)=>{
  const getData = await menuCollection.find().toArray()
  res.send(getData)
 })
 app.get('/reviews', async(req,res)=>{
  const getData = await reviewsCollection.find().toArray()
  res.send(getData)
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
