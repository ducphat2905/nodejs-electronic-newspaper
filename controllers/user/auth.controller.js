const passport = require("passport");
const AuthorModel = require('../../models/AuthorModel');
const MenuModel = require('../../models/MenuModel');
const authUtils = require('../../utils/authUtils');
const authorUtils = require('../../utils/authorUtils');
const articleUtils = require('../../utils/articleUtils');
const commonUtils = require('../../utils/commonUtils');
const mailUtils = require('../../utils/mailUtils');
const validateAuth = require('../../validation/user/validateAuth');

module.exports = {
    showLoginForm:  [
        authUtils.checkNotAuthenticatedAuthor,
        async (req, res) => {
            const menu_list = await MenuModel.find({
                status: 'Activated'
            }).sort({
                display_order: 'asc'
            });
            const selectedFields = '_id title interaction status categoryId authorId updated createdAt thumbnail_img';
            const latestArticles = await articleUtils.getLatestArticles(selectedFields, 3);
            const popularArticles = await articleUtils.getPopularArticles(selectedFields, 5);
            res.render("user/auth/login", {
                menu_list: menu_list,
                latestArticles: latestArticles,
                popularArticles: popularArticles,
            });
        }
    ],

    login: [
        authUtils.checkNotAuthenticatedAuthor,
        passport.authenticate('auth-user', {
            failureRedirect: "/login",
            failureFlash: true
        }),
        async (req, res, next) => {
                if (!req.body.remember_me) {
                    return next();
                }

                try {
                    const newToken = require('nanoid').nanoid(64);
                    const author = await AuthorModel.findOneAndUpdate({
                        _id: req.user._id
                    }, {
                        remember_token: newToken
                    });
                    if (author) {
                        res.cookie('remember_me', author.remember_token, {
                            path: '/',
                            httpOnly: true,
                            maxAge: 604800000
                        });
                    }
                    return next();
                } catch (error) {
                    return error;
                }
        },
        (req, res) => {
            req.session.user = req.user;
            return res.redirect('/');
        }
    ],

    logout:  [
        authUtils.checkAuthenticatedAuthor,
        (req, res) => {
            res.clearCookie('remember_me');
            req.logout();
            req.session.user = undefined;
            return res.redirect('/');
        }
    ],

    showSignUpForm: [
        authUtils.checkNotAuthenticatedAuthor,
        async (req, res) => {
            try {
                const menu_list = await MenuModel.find({
                    status: 'Activated'
                }).sort({
                    display_order: 'asc'
                });
                const selectedFields = '_id title interaction status categoryId authorId updated createdAt thumbnail_img';
                const latestArticles = await articleUtils.getLatestArticles(selectedFields, 3);
                const popularArticles = await articleUtils.getPopularArticles(selectedFields, 5);
                res.render("user/auth/signup", {
                    menu_list: menu_list,
                    latestArticles: latestArticles,
                    popularArticles: popularArticles,
                });
            } catch (error) {
                return res.render("error/user-404");
            }
        }
    ],

    signUp: [
        validateAuth.signup,
        async (req, res) => {
            const {
                hasError,
                errors,
                validInput
            } = validateAuth.result(req);

            if (hasError) return res.render('user/auth/signup', {
                errors: errors,
                validInput: validInput
            });

            const addedAuthor = await authorUtils.createNewAuthor(
                validInput.username,
                validInput.email,
                validInput.password
            )
            // send token to email
            const mailResponse = await mailUtils.sendVerificationEmail(addedAuthor.email, addedAuthor.verifyToken.token);

            if (addedAuthor && mailResponse && mailResponse.accepted[0] === validInput.email) {
                req.flash("addSuccess", "Successfully. Please check your email to verify your registered account. ");
                return res.redirect('/signup');
            }

            req.flash("addFail", "Failed. An error occurred during the process.");
            return res.redirect('/signup');
        }
    ],

    showVerifyTokenForm: async (req, res) => {
        // check existent and unexpired
        const isValidToken = await commonUtils.castPromiseToBoolean(
            authorUtils.validate.checkValidVerifyToken,
            [req.params.verify_token]
        );

        if (isValidToken) {
            try {
                const accountAuthor = await authorUtils.verifyAccountByToken(req.params.verify_token);
                if (accountAuthor) {
                    req.flash("verifySuccess", "Successfully. Your account is verified. You can log in now!");
                    return res.render("user/auth/verify");
                }
            } catch (error) {
                req.flash("verifyFail", "Failed. An error occurred during the process.");
                return res.render("user/auth/verify");
            }
        }

        req.flash("verifyFail", "Failed. An error occurred during the process.");
        return res.render("user/auth/verify");
    },

    showSendVerificationForm: (req, res) => {
        return res.render('user/auth/send_email', {
            form: {
                submitBtn: 'Send verification email',
                action: 'send_verification'
            }
        });
    },

    sendVerification: [
        validateAuth.send_verification,
        async (req, res) => {
            const {
                hasError,
                errors,
                validInput
            } = validateAuth.result(req);

            if (hasError) return res.render('user/auth/send_email', {
                errors: errors,
                validInput: validInput,
                form: {
                    submitBtn: 'Send verification',
                    action: 'send_verification'
                }
            });

            const isActivated = await commonUtils.castPromiseToBoolean(
                authorUtils.validate.checkActivatedStatusByEmail,
                [validInput.email]
            );
            if (isActivated) {
                req.flash("sendSuccess", "Your account was already activated.");
                return res.redirect('/send_verification');
            }
            const isPending = await commonUtils.castPromiseToBoolean(
                authorUtils.validate.checkPendingVerifyTokenByEmail,
                [validInput.email]
            );
            if (isPending) {
                req.flash("sendSuccess", "A verification email was already sent to your email.");
                return res.redirect('/send_verification');
            }

            try {
                const verification = await authorUtils.sendVerification(validInput.email);

                if (verification) {
                    req.flash("sendSuccess", "Successfully. Please check your email to verify your registered account. ");
                    return res.redirect('/send_verification');
                }

                req.flash("sendFail", "Failed. An error occurred during the process.");
                return res.redirect('/send_verification');
            } catch (error) {
                req.flash("sendFail", "Failed. An error occurred during the process.");
                return res.redirect('/send_verification');
            }
        }
    ],

    showSendResetPwdEmailForm: (req, res) => {
        return res.render('user/auth/send_email', {
            form: {
                submitBtn: 'Send reset password link',
                action: 'send_reset_pwd_email'
            }
        });
    },

    sendResetPwdEmail: [
        validateAuth.send_reset_pwd_email,
        async (req, res) => {
            const {
                hasError,
                errors,
                validInput
            } = validateAuth.result(req);
            if (hasError) return res.render('user/auth/send_email', {
                errors: errors,
                validInput: validInput,
                form: {
                    submitBtn: 'Send reset password link',
                    action: 'send_reset_pwd_email'
                }
            });
            const isPending = await commonUtils.castPromiseToBoolean(
                authorUtils.validate.checkPendingVerifyTokenByEmail,
                [validInput.email]
            );
            console.log(isPending);
            if (isPending) {
                req.flash("sendSuccess", "An email was already sent to you. Please check your email again.");
                return res.redirect('/send_reset_pwd_email');
            }
            try {
                const resetPwdRes = await authorUtils.sendResetPwd(validInput.email);

                if (resetPwdRes) {
                    req.flash("sendSuccess", "Successfully. Please check your email to reset your password");
                    return res.redirect('/send_reset_pwd_email');
                }

                req.flash("sendFail", "Failed. An error occurred during the process.");
                return res.redirect('/send_reset_pwd_email');
            } catch (error) {
                req.flash("sendFail", "Failed. An error occurred during the process.");
                return res.redirect('/send_reset_pwd_email');
            }
        }
    ],

    showResetPwdForm: async (req, res) => {
        const isValidToken = await commonUtils.castPromiseToBoolean(
            authorUtils.validate.checkValidVerifyToken,
            [req.params.verify_token]
        );

        if (isValidToken) return res.render("user/auth/reset_pwd", {
            isValidToReset: true,
            isSuccessful: false,
            verifyToken: req.params.verify_token
        });

        req.flash("resetPwdFail", "Failed. An error occurred during the process.");
        return res.render("user/auth/reset_pwd", {
            isValidToReset: false,
            isSuccessful: false
        });

    },

    resetPwd: [
        validateAuth.reset_pwd,
        async (req, res) => {
            const isValidToken = await commonUtils.castPromiseToBoolean(
                authorUtils.validate.checkValidVerifyToken,
                [req.params.verify_token]
            );

            if (isValidToken) {
                const {
                    hasError,
                    errors,
                    validInput
                } = validateAuth.result(req);
                if (hasError) return res.render("user/auth/reset_pwd", {
                    verifyToken: req.params.verify_token,
                    isValidToReset: true,
                    isSuccessful: false,
                    errors: errors,
                    validInput: validInput
                });

                const resetPwdRes = await authorUtils.reset_pwd(req.params.verify_token, validInput.password);
                // console.log(resetPwdRes);
                if (resetPwdRes) {
                    req.flash("sendSuccess", "Successfully. Please check your email to reset your password");
                    return res.render("user/auth/reset_pwd", {
                        isSuccessful: true,
                    });
                }
            };

            req.flash("resetPwdFail", "Failed. An error occurred during the process.");
            return res.render("user/auth/reset_pwd", {
                isValidToReset: false,
                isSuccessful: false
            });
        }
    ]
}