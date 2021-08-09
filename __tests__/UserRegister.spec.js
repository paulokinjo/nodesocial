const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => sequelize.sync());
beforeEach(() => User.destroy({ truncate: true }));

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const { status } = await postUser();
    expect(status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const {
      body: { message },
    } = await postUser();
    expect(message).toBe('User created');
  });

  it('saves the user to database', async () => {
    await postUser();
    const { length } = await User.findAll();
    expect(length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const { username, email } = userList[0];
    expect(username).toBe('user1');
    expect(email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const { password } = userList[0];
    expect(password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: undefined,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });

    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });

    const { validationErrors } = response.body;
    expect(validationErrors).not.toBeUndefined();
  });

  it('returns Username cannot be null when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });

    const { validationErrors } = response.body;
    expect(validationErrors.username).toBe('Username cannot be null');
  });

  it('returns E-mail cannot be null when email is null', async () => {
    const response = await postUser({
      username: 'user1',
      email: null,
      password: 'P4ssword',
    });

    const { validationErrors } = response.body;
    expect(validationErrors.email).toBe('E-mail cannot be null');
  });

  it('returns errors for both when username and email are null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });

    const { validationErrors } = response.body;
    expect(Object.keys(validationErrors)).toEqual(['username', 'email']);
  });

  it('returns Password cannot be null message when password is null', async () => {
    const response = await postUser({
      username: 'user1',
      email: 'user1@mail.com',
      password: null,
    });

    const { validationErrors } = response.body;
    expect(validationErrors.password).toBe('Password cannot be null');
  });

  it.each([
    ['username', 'Username cannot be null'],
    ['email', 'E-mail cannot be null'],
    ['password', 'Password cannot be null'],
  ])(
    'when %s is null "%s" message is received',
    async (field, expectedMessage) => {
      const user = {
        username: 'user1',
        email: 'user1@email.com',
        password: 'P4ssword',
      };

      user[field] = null;
      const response = await postUser(user);

      const { validationErrors } = response.body;
      expect(validationErrors[field]).toBe(expectedMessage);
    }
  );

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${'Username cannot be null'}
    ${'username'} | ${'usr'}            | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}   | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}             | ${'E-mail cannot be null'}
    ${'email'}    | ${'@mail.com'}      | ${'E-mail is not valid'}
    ${'email'}    | ${'user1.mail.com'} | ${'E-mail is not valid'}
    ${'email'}    | ${'user1@.com'}     | ${'E-mail is not valid'}
    ${'password'} | ${null}             | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}          | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'1234567890'}     | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'lowerANDUPPER'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'lowerand1234'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'UPPERAND1234'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
  `(
    'returns "$expectedMessage" when $field is $value',
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@email.com',
        password: 'P4ssword',
      };

      user[field] = value;
      const response = await postUser(user);

      const { validationErrors } = response.body;
      expect(validationErrors[field]).toBe(expectedMessage);
    }
  );

  it('returns size validation error when username is less than 4 characters', async () => {
    const user = {
      username: 'usr',
      email: 'user1@email.com',
      password: 'P4ssword',
    };

    const response = await postUser(user);

    const { validationErrors } = response.body;
    expect(validationErrors.username).toBe(
      'Must have min 4 and max 32 characters'
    );
  });

  it('returns E-mail in use when same email is already in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser);

    expect(response.body.validationErrors.email).toBe(
      'E-mail already been used'
    );
  });

  it('returnes errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });

    const { validationErrors } = response.body;
    expect(Object.keys(validationErrors)).toEqual(['username', 'email']);
  });
});
