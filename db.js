// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',     // change if needed
  user: 'root',          // your MySQL user
  password: 'Mani2006', // <- change this
  database: 'supermarket'
});

module.exports = pool;
