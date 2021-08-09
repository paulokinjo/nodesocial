const User = require('./User');
const bcrypt = require('bcrypt');

const save = async (body) => {
  const { password } = body;
  const hash = await bcrypt.hash(password, 10);

  const user = {
    ...body,
    password: hash,
  };

  await User.create(user);
};

const findByEmail = async (email) => await User.findOne({ where: { email } });

module.exports = { save, findByEmail };
