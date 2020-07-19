
// const AdminModel = require("../../models/AdministratorModel");

const router = require('express').Router();
const { indexController } = require('../../controllers/admin/index.controller');
const {checkAuthenticatedAdmin} = require("../../utils/authUtils");

// router.use(checkAuthenticatedAdmin);

router.get("/", indexController );

module.exports = router;