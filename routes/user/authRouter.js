const express = require('express');
const authRouter = express.Router();
const {body, matchedData, validationResult} = require('express-validator');
const AuthorModel = require('../../models/ArticleModel');
const authorUtils = require('../../utils/authorUtils');
const commonUtils = require('../../utils/commonUtils');
const mailUtils = require('../../utils/mailUtils');

authRouter.get('/login', async (req,res) => {

    res.render("user/auth/login");
})

authRouter.get('/signup', async (req,res) => {

    res.render("user/auth/signup");
})

authRouter.post(
    '/signup',
    [
        body('username').isAlphanumeric().trim().withMessage('Only letters and numbers are allowed.')
            .isLength({min: 4, max: 30}).bail().custom(authorUtils.checkExistedUsername).withMessage('Username already existed.'),
        body('email').isEmail().normalizeEmail().withMessage('Email is not valid.')
            .bail().custom(authorUtils.checkExistedEmail).withMessage('Email already existed.'),
        body('password').isLength({min: 4, max: 30}).withMessage('Password must be in range of 4-30 characters.')
            .escape(),
        body('confirm_password').custom(commonUtils.checkPasswordConfirmation)
    ],
    async (req,res) => {
        const errors = validationResult(req);
        const validInput = matchedData(req);

        if(!errors.isEmpty()) {
            return res.render('user/auth/signup',
            {
                errors: errors.array(),
                validInput: validInput
            });
        }

        try {
            const addedAuthor = await authorUtils.createNewAuthor(
                validInput.username,
                validInput.email,
                validInput.password
            )
            if (!addedAuthor){
                req.flash("addFail","Failed. An error occurred during the process.");
                return res.redirect('/signup');
            }
            // send token to email
            let sending_info = {
                send_to: 'phat.tran2905@gmail.com',
                subject: 'Signup',
                text: 'Verification email. Click this link to verify your account http://localhost:5000/verify/' 
                    + commonUtils.normalizeVerifyToken(addedAuthor.verifyToken.token),
                html: '<h2>Click this link</h2><a href="localhost:5000/verify/'
                    + commonUtils.normalizeVerifyToken(addedAuthor.verifyToken.token) 
                    +   '">verify</a>'
            };

            const mailSender = await mailUtils.sendEmail(sending_info);
            
            if(!mailSender.response.includes("250 Accepted")){
                req.flash("addFail","Failed. An error occurred during the process.");
                return res.redirect('/signup');
            }else {
                req.flash("addSuccess","Successfully. Please check your email to verify your registered account. ");
                return res.redirect('/signup');
            }
        } catch (error) {
            return console.log(error);
        }
    }
)

authRouter.get('/verify/:verify_token',
    async (req,res) => {
        const isUsedToken = await authorUtils.checkUsedVerifyToken(req.params.verify_token);
        // if (isUsedToken){
        //     req.flash("verifyFail", "Failed. Please request a verification email again!");
        //     return res.render("user/auth/verify");
        // }

        const activatedAuthor = await authorUtils.verifyAccountByToken(req.params.verify_token);
        if (activatedAuthor) {
            req.flash("verifySuccess", "Your account is verified. You can log in now!");
        }else {
            req.flash("verifyFail", "Failed. Please request a verification email again!");
        }
        return res.render("user/auth/verify");
    }
);

module.exports = authRouter;