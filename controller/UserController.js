const bcrypt = require("bcrypt");
const User = require("../models/User");
const connectDB = require("../config/db");

const UserController = {
  getUsers: async (event, context) => {
    try {
      connectDB();
      console.log("Fetching users every 2 sec on focus...");
      const users = await User.find();
      if (users.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "No users" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(users),
      };
    } catch (err) {
      console.log(err);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  },

  createUser: async (event, context) => {
    try {
      connectDB();

      const { username, dob, email, password } = JSON.parse(event.body);
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (username.toLowerCase() === "admin") {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message:
              "Users are not allowed to use Admin as username, Try different username",
          }),
        };
      }
      if (age < 13) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "User must be at least 13 years old to sign up",
          }),
        };
      }
      const userFromDatabase = await User.findOne({ username });
      if (userFromDatabase) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "User already exists with same username!" }),
        };
      }
      const emailFromDatabase = await User.findOne({ email });
      if (emailFromDatabase) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "User already exists with same email!" }),
        };
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({
        username,
        dob,
        email,
        password: hashedPassword,
      });
      await newUser.save();
      return {
        statusCode: 201,
        body: JSON.stringify({ message: "User created successfully" }),
      };
    } catch (error) {
      console.error("Error creating user:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: error.message || "Error creating user. Please try again.",
        }),
      };
    }
  },

  loginUser: async (event, context) => {
    try {
      connectDB();

      const { username, password } = JSON.parse(event.body);
      const user = await User.findOne({ username });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Invalid credentials", passed: false }),
        };
      }
      if (user.isBanned) {
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "You have been banned, contact admins." }),
        };
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: "Invalid credentials", passed: false }),
        };
      }
      const token = jwt.sign({ user: user.username }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Login successful", passed: true, token, user: user }),
      };
    } catch (error) {
      console.error("Error during login:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error during login. Please try again." }),
      };
    }
  },
};

module.exports = UserController;
