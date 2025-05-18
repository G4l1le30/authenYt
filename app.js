const express= require('express')
const app=express()
const path=require('path') //default js, gaperlu diinstall
//konfigurasi .env
const dotenv = require('dotenv')
dotenv.config({path: './.env'})
//koneksi mysql
const mysql = require('mysql')
const { register } = require('module')
const db = mysql.createConnection({
    host:process.env.DATABASE_HOST,
    user:process.env.DATABASE_USER,
    password:process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})
//extension handlebar (hbs)
const publicDirectory=path.join(__dirname, './public/') //dirname: variabel nodejs untuk kasih akses current dir
//kalau ditambah /public, sekarang app ngeliat semua yang ada di folder public
app.use(express.static(publicDirectory))
app.set('view engine', 'hbs')

//konek mysql
db.connect((err) => {
    if(err){
        console.log(err)
    } else{
        console.log("MySQL connected")
    }
})
//inisialisasi port
const port = process.env.PORT || 5000;
//testing request 
app.get("/",(req, res)=> {
   // res.send("<h1>test</h1>")
   res.render("index")
})
//request dari index ke register
app.get("/register",(req, res)=>{
    res.render("register")
})
//deklarasi port 
app.listen(port, ()=>{
    console.log(`server started on port ${port}`)
})