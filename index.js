const express = require('express')
const app =express();
const cors = require('cors')
require('dotenv').config
const port = process.env.PORT || 4000;

// middleware 

app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send('newstravel is running')
})

app.listen(port, () => {
    console.log(`newstravel is running on ${port}`);
})