const express= require('express')
const app=express()
const hbs = require('hbs');

// Register helper untuk format harga
hbs.registerHelper('formatPrice', function(price) {
  return new Intl.NumberFormat('id-ID').format(price);
});
const path=require('path') //default js, gaperlu diinstall
//konfigurasi .env
const dotenv = require('dotenv')
dotenv.config({path: './.env'})
//cookie-parser
const cookieParser = require('cookie-parser');

// Use cookie parser middleware
app.use(cookieParser());

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

//get data dari form
//parsing url encoded bodies (saat di sent oleh html forms)
app.use(express.urlencoded({extended: false}))

app.use(express.json())

app.set('view engine', 'hbs')


//konek mysql
db.connect((err) => {
    if(err){
        console.log(err)
    } else{
        console.log("MySQL connected")
    }
})

//mysql wishlist
// Tambahkan di app.js setelah koneksi database
app.get('/', (req, res) => {
  db.query('SELECT * FROM products', (error, products) => {
    if (error) {
      console.log(error);
      return res.render('index', { products: [] });
    }
    res.render('index', { products, user: res.locals.user });
  });
});

//inisialisasi port
const port = process.env.PORT || 5000;
// //testing request 
// app.get("/",(req, res)=> {
//    // res.send("<h1>test</h1>")
//    res.render("index")
// })
// //request dari index ke register
// app.get("/register",(req, res)=>{
//     res.render("register")
// })
////request dari index ke login
//app.get("/login",(req, res)=>{
//    res.render("login")
//})

//define routes
app.use('/',require('./routes/pages'))
app.use('/auth',require('./routes/auth'))


//deklarasi port 
app.listen(port, ()=>{
    console.log(`server started on port ${port}`)
})