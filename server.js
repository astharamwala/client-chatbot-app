const express = require('express')
var path = require("path");
const app = express()
const port = 3000
const dialogflow = require('./utils/dialogflow_utils.js')
var contact = {
  // Contexts: [
  //   {
  //     name: "testName"
  //   }
  // ],
  id: 1,
}

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname+'/templates/index.html'));
})

app.post('/send_message', (req, res) => {
  user_message = req.body.message
  console.log("user message: ", user_message)
  // send user message to dialogflow API
  dialogflow.sendMessage(user_message, contact)
})

app.post('/message/dialogflow/sendsms', (req, res) => {
  console.log("Reply recieved from dialogflow!", req.body)
  res.json({
    sucess:"Message Received!"
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})