const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4zx1pf4.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



    const drawingCollection = client.db("drawingClass").collection("teacher");
    const classCollection = client.db("drawingClass").collection("class");
    const cartCollection = client.db("drawingClass").collection("cart");

    // teacher data
    app.get('/teacher', async(req, res)=>{
        const result = await drawingCollection.find().toArray();
        res.send(result);
    })

    // class data
    app.get('/class', async(req, res)=>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })


    // cart data post 
    app.post('/cart', async(req, res) =>{
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('boss is sitting')
})

app.listen(port, ()=>{
    console.log(`Sir draw the picture${port}`);
})
