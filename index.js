const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken') 
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


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
    const userCollection = client.db("drawingClass").collection("user");


    // jwt use
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })

      res.send({ token })
    })

    // use verifyJWT before usong verifyAdmin
    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await userCollection.findOne(query);
      if(user?.role !== 'admin' ){
        return res.status(403).send({error: true, message: 'Forbidden message'})
      }
      next();
    }


    // get users
    app.get('/users', verifyJWT, verifyAdmin, async(req, res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // user Collection
    app.post('/users', async(req, res)=>{
      const user = req.body;
      console.log(user)
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user already exist'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    // convert users into admin
    app.patch('/users/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    // security check
    app.get('/users/admin/:email', verifyJWT, async (req, res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({ admin: false })
      }

      const query = {email: email}
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })


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

    // class data post
    app.post('/class', verifyJWT, verifyAdmin, async(req, res)=>{
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem);
      res.send(result);
    })

    // delete class
    app.delete('/class/:id', verifyJWT, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })


    // cart data post 
    app.post('/carts', async(req, res) =>{
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })


    // cart collection apis
    app.get('/carts', verifyJWT,  async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'porbiden access' })
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // cart delete
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async(req, res)=>{
      const {price} = req.body;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
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
