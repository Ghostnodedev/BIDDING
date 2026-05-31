const express = require("express")
const dotenv = require("dotenv")
const router = express.Router()
const cont = require("../controller/regandlog.js")
const admin = require("../controller/adminwork.js")
const middleware = require("../middleware/middleware.js")


dotenv.config()
const app = express()
app.use(express.json())

router.post('/register', cont.register)
router.post('/verify', cont.verify)
router.post('/login', cont.login)
router.post('/create-auction', middleware.middlewre, middleware.roleauth, admin.createAuction)
router.get('/admin/my-auctions', middleware.middlewre, middleware.roleauth, admin.myauctions)
router.get('/admin/auctions/:auctionId', middleware.middlewre, middleware.roleauth, admin.singleAuction)
router.post('/admin/close/:id', middleware.middlewre, middleware.roleauth, admin.closeauct)


app.get('/', (req, res) => {
  res.send('API running...')
})

module.exports = router