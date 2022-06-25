const express = require('express');
const router = express.Router();
const sql = require('../lib/sql');
const config = require('../config/connection');
const mysql = require('mysql');
const pool = mysql.createPool(config);

/* GET users listing. */
router.get('/', (req, res, next) => {
  res.send('respond with a resource');
});

module.exports = router;

module.exports.api = {
  queryWords: (req, res) => {
    pool.getConnection((err, connection) => {
      const { user } = req.body;
      connection.query(sql.userWordsQuery(user), (err, rows, fields) => {
        connection.release();
        if (err) throw err;
        res.send(JSON.stringify(rows));
      });
    });
  },

  acquaint: (req, res) => {
    pool.getConnection((err, connection) => {
      const { word, user } = req.body;
      connection.query(sql.acquaintWordByUser(word, user), (err, rows, fields) => {
        connection.release();
        if (err) throw err;
        res.send(JSON.stringify(rows));
      });
    });
  },

  revokeWord: (req, res) => {
    pool.getConnection((err, connection) => {
      const { word, user } = req.body;
      connection.query(sql.revokeWordByUser(word, user), (err, rows, fields) => {
        connection.release();
        if (err) throw err;
        res.send(JSON.stringify(rows));
      });
    });
  },
}
