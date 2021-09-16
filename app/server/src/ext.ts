import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
require('dotenv').config()

const argon2 = require('argon2')
const util = require('util')
const { pipeline } = require('stream')
const pump = util.promisify(pipeline)
const midtransClient = require('midtrans-client')
const midtrans = new midtransClient.Snap({
  isProduction: false,
  serverKey: 'SB-Mid-server-t2vnOvJn-vJuyjXOrfOQGd_1',
  clientKey: 'SB-Mid-client-Ytnnyy8iKJ5roRw3',
})

const mime = require('mime')
const axios = require('axios')

export default {
  FormData,
  path,
  fs,
  pump,
  midtrans,
  argon2,
  mime,
  axios,
  env: process.env,
}
