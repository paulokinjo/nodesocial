const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('usernameNull')
    .bail() // no need to check further
    .isLength({ min: 4, max: 32 })
    .withMessage('usernameSize'),
  check('email')
    .notEmpty()
    .withMessage('emailNull')
    .bail()
    .isEmail()
    .withMessage('emailInvalid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('emailInUse');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('passwordNull')
    .bail()
    .isLength({ min: 6 })
    .withMessage('passwordSize')
    .bail()
    .isStrongPassword({
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minLength: 6,
      minSymbols: 0,
    })
    .withMessage('passwordPattern'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors
        .array()
        .forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
      const response = { validationErrors };
      return res.status(400).send(response);
    }

    await UserService.save(req.body);
    return res.status(200).send({ message: req.t('UserCreatedSuccess') });
  }
);

module.exports = router;
