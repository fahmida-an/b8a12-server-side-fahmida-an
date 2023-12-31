const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app =express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware 

app.use(cors(
  origin='http://localhost:5173/'
))
app.use(express.static("public"))
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdaizgq.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    const newsCollection = client.db("NewsDb").collection("news");
    const usersCollection = client.db("NewsDb").collection("users");
    const premiumCollection = client.db("NewsDb").collection("premium");
    const premiumPackageCollection = client.db("NewsDb").collection("premiumPackage");
    const paymentCollection = client.db("NewsDb").collection("payments");
    const publisherCollection = client.db("NewsDb").collection("publisher");
    const reviewCollection = client.db("NewsDb").collection("testimonial");

    // jwt api 

    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '365d'})
      res.send({token})
    })

    //middlewares
    const verifyToken = (req,res,next) => {
      console.log('inside verify token', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
        if(err) {
          return res.status(403).send({message: 'forbidden'})
        }
        req.decoded = decoded;
        next()
      })
     
    }

    const verifyAdmin= async(req,res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === "admin";
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    //news api
    app.get("/news", async(req,res) => {
      // const filter = req.query;
      // console.log(filter);
      // const query ={
      //   title: {$regex: filter.search} 
      // }
        const result = await newsCollection.find().toArray()
        res.send(result)
    })

  

    app.post("/news", async(req,res) => {
      const newNews = req.body;
      const result = await newsCollection.insertOne(newNews)
      res.send(result)
    })

    app.get('/news/:id', async(req,res) => {
      const id = req.params.id;
      const query ={ _id: new ObjectId(id)}
      const result = await newsCollection.findOne(query)
      res.send(result)
    })

    app.delete('/news/:id', async(req,res)=> {
      const id = req.params.id;
      const query ={ _id: new ObjectId(id)}
      const result = await newsCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/news/approve/:id', async (req, res) => {
      const newsId = req.params.id;
    
      try {
        const filter = { _id: new ObjectId(newsId) };
        const updatedDoc = {
          $set: {
            status: 'approved'
          }
        };
        const result = await newsCollection.updateOne(filter, updatedDoc);
        res.send(result)
      } catch (error) {
        console.error(error);
      }
    });

    app.put('/news/:id', async(req,res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          title: item.title,
          publisher: item.publisher,
          newstab: item.newstab,
          image:item.image,
          details: item.details,
          date:item.date,
          email: item.email
        }
      }
      const result = newsCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
   

    app.get('/publisher', async(req,res) => {
      const result = await publisherCollection.find().toArray()
      res.send(result)
    })

    app.post("/publisher", async(req,res) => {
      const newPublisher = req.body;
      const result = await publisherCollection.insertOne(newPublisher)
      res.send(result)
    })


    app.post("/premiumPackage", async(req,res)=> {
      const premiumUser = req.body;
      const result = await premiumPackageCollection.insertOne(premiumUser)
      res.send(result)
    })


    app.get("/premiumPackage", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email };
        const result = await premiumPackageCollection.find(query).toArray();  
        res.send(result);
      } catch (error) {
        console.error("Error retrieving premium package information:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/premium", verifyToken, async(req,res) => {
      const result = await premiumCollection.find().toArray()
      res.send(result)
    })

    // user api 

    app.get('/users', async(req,res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.delete('/users/:id', async(req,res) => {
      const id = req.params.id;
      const query ={ _id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })


    app.put('/users/:email', async (req, res) => {
        const email = req.params.email
        const user = req.body
        const query = { email: email }
        const options = { upsert: true }
        const isExist = await usersCollection.findOne(query)
        console.log('User', isExist)
        if (isExist) return res.send(isExist)
        const result = await usersCollection.updateOne(
          query,
          {
            $set: { ...user, timestamp: Date.now() },
          },
          options
        )
        res.send(result)
      })

      app.patch('/update/:email', async(req,res) => {
        const email = req.params.email
        const user = req.body
        const query = { email: email }
        const updatedDoc = {
          $set: {
            name: user.name,
            email: user.email,

          }
        }
        const result = usersCollection.updateOne(filter, updatedDoc)
        res.send(result)
      })
     

      app.get('/users/:email', async (req,res) => {
        const email = req.params.email;
        const result  = await usersCollection.findOne({email})
        res.send(result)
      })

      //admin api

      app.get('/users/admin/:email', async(req,res)=> {
        const email = req.params.email;
        const query = {email: email}
        const user = await usersCollection.findOne(query);

        if(user){
          admin = user?.role === 'admin'
        }
        res.send({admin});
      })


      app.patch('/users/admin/:id', async(req,res) => {
        const userId = req.params.id;
        const filter = {_id: new ObjectId(userId)}
        const updatedDoc = {
          $set: {
            role: 'admin'
          }
        }
        const result = await usersCollection.updateOne(filter, updatedDoc)
        res.send(result)
      })

      //premium users api

      app.get('/users/premium/:email', async(req,res)=> {
        const email = req.params.email;
        const query = {email: email}
        const user = await usersCollection.findOne(query);

        if(user){
          premium = user?.role === 'premium'
        }
        res.send({premium});
      })

      //reviews

      
    app.get('/testimonial', async(req,res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })


    app.post("/testimonial", async(req,res) => {
      const newTestimonial = req.body;
      const result = await reviewCollection.insertOne(newTestimonial)
      res.send(result)
    })

      //payment intent
      // 1.
      app.post('/create-payment-intent', async(req,res) => {
        const {price} = req.body;
        const amount = parseInt(price*100)
        console.log(amount, 'amount inside the intent');
        const paymentIntent = await stripe.paymentIntents.create({
          amount:amount,
          currency: 'usd',
          payment_method_types: ['card']

        })
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })

      // 2 payment api

      app.post('/payments', verifyToken, async(req,res) => {
        const payment = req.body;
        const paymentResult = await paymentCollection.insertOne(payment)
        const userEmail = payment.email;

        const updateResult = await usersCollection.updateOne(
          { email: userEmail, role: 'normal' }, 
          { $set: { role: 'premium' } } 
        );

        if (updateResult.modifiedCount === 1) {
          res.status(200).send(' updated');
        } else {
          res.status(401).send('not updated');

          
        }
        res.send(paymentResult, updateResult)
      })









    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('newstravel is running')
})

app.listen(port, () => {
    console.log(`newstravel is running on ${port}`);
})