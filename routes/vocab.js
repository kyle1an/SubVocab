const express = require('express');
const router = express.Router();
const { pool } = require('../config/connection');
const { isTokenInvalid } = require('../lib/timeUtil');
/* GET users listing. */
router.get('/', (req, res, next) => {
  res.send('respond with a resource');
});

module.exports = router;

module.exports.queryWords = async (req, res) => {
  let { user, acct } = req.body;
  if (user && await isTokenInvalid(req, res, acct)) user = ''
  pool.getConnection((err, connection) => {
    connection.query(`
    CALL words_from_user(get_user_id_by_name('${user}'));
    `, (err, rows, fields) => {
      connection.release();
      if (err) throw err;
      res.send(JSON.stringify(rows[0]));
    });
  });
}

module.exports.stemsMapping = async (req, res) => {
  pool.getConnection((err, connection) => {
    connection.query(`
    CALL stem_derivation_map();
    `, (err, rows, fields) => {
      connection.release();
      if (err) throw err;
      res.send(JSON.stringify(rows[0]));
    });
  });
}

module.exports.acquaint = async (req, res) => {
  const { word, user, acct } = req.body;
  if (await isTokenInvalid(req, res, acct)) return res.send(JSON.stringify({ affectedRows: 0, message: 'Invalid' }));
  pool.getConnection((err, connection) => {
    connection.query(`
    CALL acquaint_vocab_record(get_valid_vocab('${word}'), get_user_id_by_name('${user}'));
    `, (err, rows, fields) => {
      connection.release();
      if (err) throw err;
      res.send(JSON.stringify(rows));
    });
  });
}

module.exports.revokeWord = async (req, res) => {
  const { word, user, acct } = req.body;
  if (await isTokenInvalid(req, res, acct)) return res.send(JSON.stringify({ affectedRows: 0, message: 'Invalid' }));
  pool.getConnection((err, connection) => {
    connection.query(`
    CALL revoke_vocab_record('${word}', get_user_id_by_name('${user}'));
    `, (err, rows, fields) => {
      connection.release();
      if (err) throw err;
      res.send(JSON.stringify(rows));
    });
  });
}


