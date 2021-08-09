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

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(user);
};

describe('User Registration', () => {
  const usernameNull = 'Username cannot be null';
  const usernameSize = 'Must have min 4 and max 32 characters';
  const emailNull = 'E-mail cannot be null';
  const emailInvalid = 'E-mail is not valid';
  const passwordNull = 'Password cannot be null';
  const passwordSize = 'Password must be at least 6 characters';
  const passwordPattern =
    'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';

  const emailInUse = 'E-mail in use';
  const userCreatedSuccess = 'User created';

  it('returns 200 OK when signup request is valid', async () => {
    const { status } = await postUser();
    expect(status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const {
      body: { message },
    } = await postUser();
    expect(message).toBe(userCreatedSuccess);
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
    ${'username'} | ${null}             | ${usernameNull}
    ${'username'} | ${'usr'}            | ${usernameSize}
    ${'username'} | ${'a'.repeat(33)}   | ${usernameSize}
    ${'email'}    | ${null}             | ${emailNull}
    ${'email'}    | ${'@mail.com'}      | ${emailInvalid}
    ${'email'}    | ${'user1.mail.com'} | ${emailInvalid}
    ${'email'}    | ${'user1@.com'}     | ${emailInvalid}
    ${'password'} | ${null}             | ${passwordNull}
    ${'password'} | ${'P4ssw'}          | ${passwordSize}
    ${'password'} | ${'alllowercase'}   | ${passwordPattern}
    ${'password'} | ${'ALLUPPERCASE'}   | ${passwordPattern}
    ${'password'} | ${'1234567890'}     | ${passwordPattern}
    ${'password'} | ${'lowerANDUPPER'}  | ${passwordPattern}
    ${'password'} | ${'lowerand1234'}   | ${passwordPattern}
    ${'password'} | ${'UPPERAND1234'}   | ${passwordPattern}
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

  it(`returns ${emailInUse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser);

    expect(response.body.validationErrors.email).toBe(emailInUse);
  });

  it('returns errors for both username is null and email is in use', async () => {
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

describe('Internationalization', () => {
  const usernameNull = 'Username nao pode ser null';
  const usernameSize = 'Deve possuir no minimo 4 and no maximo 32 characters';
  const emailNull = 'E-mail nao pode ser null';
  const emailInvalid = 'E-mail nao e valido';
  const passwordNull = 'Password nao pode ser null';
  const passwordSize = 'Password deve possuir ao menos 6 letras';
  const passwordPattern =
    'Password deve possuir ao menos 1 Maiuscula, 1 letra minuscula e 1 numero';

  const emailInUse = 'E-mail ja esta sendo usado';
  const userCreatedSuccess = 'Usuario criado com sucesso';

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${usernameNull}
    ${'username'} | ${'usr'}            | ${usernameSize}
    ${'username'} | ${'a'.repeat(33)}   | ${usernameSize}
    ${'email'}    | ${null}             | ${emailNull}
    ${'email'}    | ${'@mail.com'}      | ${emailInvalid}
    ${'email'}    | ${'user1.mail.com'} | ${emailInvalid}
    ${'email'}    | ${'user1@.com'}     | ${emailInvalid}
    ${'password'} | ${null}             | ${passwordNull}
    ${'password'} | ${'P4ssw'}          | ${passwordSize}
    ${'password'} | ${'alllowercase'}   | ${passwordPattern}
    ${'password'} | ${'ALLUPPERCASE'}   | ${passwordPattern}
    ${'password'} | ${'1234567890'}     | ${passwordPattern}
    ${'password'} | ${'lowerANDUPPER'}  | ${passwordPattern}
    ${'password'} | ${'lowerand1234'}   | ${passwordPattern}
    ${'password'} | ${'UPPERAND1234'}   | ${passwordPattern}
  `(
    'returns "$expectedMessage" when $field is $value when language is set as portuguese',
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@email.com',
        password: 'P4ssword',
      };

      user[field] = value;
      const response = await postUser(user, { language: 'pt' });

      const { validationErrors } = response.body;
      expect(validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${emailInUse} when same email is already in use when language is set to portuguese`, async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser, { language: 'pt' });

    expect(response.body.validationErrors.email).toBe(emailInUse);
  });

  it(`returns success message of ${userCreatedSuccess} when signup request is valid and language is portuguese`, async () => {
    const {
      body: { message },
    } = await postUser(validUser, { language: 'pt' });
    expect(message).toBe(userCreatedSuccess);
  });
});
