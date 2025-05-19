// server.js
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware ---------------------------------------------------------------------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' },
}));
app.use(passport.initialize());
app.use(passport.session());
const isAdmin = (req, res, next) => {
  const adminEmails = process.env.ADMIN_EMAILS.split(",");
  if (req.isAuthenticated() && adminEmails.includes(req.user.email)) {
    return next();
  }
  res.status(403).send("Access denied. Admins only.");
};

// Mongoose Setup -----------------------------------------------------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo connection error:", err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetToken: String,
  resetTokenExpiry: Date,
});

const User = mongoose.model("User", userSchema);

// Add to your existing server.js after User model

// Project Schema
const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String, // This will be used in the URL
  projects: [{
    title: String,
    description: String,
    techStack: [String],
    images: [String],
    liveUrl: String,
    githubUrl: String,
    category: String,
    featured: Boolean,
    createdAt: { type: Date, default: Date.now }
  }],
  profile: {
    name: String,
    bio: String,
    avatar: String,
    socialLinks: {
      github: String,
      linkedin: String,
      twitter: String,
      personalWebsite: String
    }
  },
  template: { type: String, default: 'default' }
});

const Project = mongoose.model('Project', projectSchema);

// Passport Config ----------------------------------------------------------------
passport.use(new LocalStrategy({ usernameField: "username" }, async (username, password, done) => {
  try {
    const user = await User.findOne({ email: username });
    if (!user) return done(null, false, { message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? done(null, user) : done(null, false, { message: "Invalid credentials" });
  } catch (err) {
    return done(err);
  }
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({ email: profile.email, password: "google", isVerified: true });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Email Transport ----------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Routes -------------------------------------------------------------------------

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email: username });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      email: username,
      password: hashedPassword,
      verificationToken,
    });

    const verifyLink = `http://localhost:3000/verify-email/${verificationToken}`;
    await transporter.sendMail({
  from: '"VaultX" <your-email@gmail.com>', // or noreply@vaultx.com
  to: username,
  subject: "Verify Your VaultX Account",
  text: `Hi there!\n\nPlease verify your email by visiting the link: ${verifyLink}`,
  html: `
    <h2>Hi there!</h2>
    <p>Thanks for signing up with VaultX. Please click the button below to verify your email address:</p>
    <p><a href="${verifyLink}" style="padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none;">Verify My Email</a></p>
    <p>If you didn’t create a VaultX account, just ignore this email.</p>
  `,
});

   
    
    res.status(200).json({ message: "Registered, verify email sent", user: newUser });
  } catch (err) {
     
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/verify-email/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOneAndUpdate(
      { verificationToken: token },
      { isVerified: true, verificationToken: null },
      { new: true }
    );
    if (!user) return res.status(400).send("Invalid or expired token");
    res.redirect("http://localhost:5173/login?verified=true"); 
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
   if (!user) return res.status(401).json({ message: info.message });
if (!user.isVerified) return res.status(403).json({ message: "Please verify your email first" });


    req.login(user, (err) => {
      if (err) return next(err);
      req.session.save(() => {
        res.status(200).json({ message: "Logged in", user });
      });
    });
  })(req, res, next);
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:5173/",
    failureRedirect: "http://localhost:5173/login",
  })
);

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + 3600000;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password/${token}`;
    await transporter.sendMail({
      to: email,
      subject: "Reset Your Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    res.status(200).json({ message: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});

app.get("/logout", (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: "Logout error" });
    res.status(200).json({ message: "Logged out" });
  });
});

app.get("/check-auth", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
  authenticated: true,
  user: {
    _id: req.user._id,
    email: req.user.email,
    isVerified: req.user.isVerified,
  },
});

  } else {
    res.status(401).json({ authenticated: false });
  }
});

app.set("view engine", "ejs");
// Add this route to server.js
app.get('/api/profiles/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const profile = await Project.findOne({ username });
    res.json({ exists: !!profile });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/admin", isAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();
    res.render("admin", { 
      users,
      user: req.user // Add this line to pass the current admin user to the template
    });
  } catch (err) {
    res.status(500).send("Error loading admin panel");
  }
});

app.post("/admin/delete/:id", isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    res.status(500).send("Error deleting user");
  }
});

app.post("/admin/verify/:id", isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isVerified: true, verificationToken: null });
    res.redirect("/admin");
  } catch (err) {
    res.status(500).send("Error verifying user");
  }
});

app.post("/admin/reset-password/:id", isAdmin, async (req, res) => {
  const { newPassword } = req.body;
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    });
    res.redirect("/admin");
  } catch (err) {
    res.status(500).send("Error resetting password");
  }
});
// Middleware to check if user owns the profile
const isProfileOwner = (req, res, next) => {
  if (req.isAuthenticated() && req.user.username === req.params.username) {
    return next();
  }
  res.status(403).json({ message: "Unauthorized access" });
};

// Routes for Projects
app.post('/api/profiles', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const { username } = req.body;
    
    // Check if username is available
    const existingProfile = await Project.findOne({ username });
    if (existingProfile) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Create new profile
    const newProfile = await Project.create({
      userId: req.user._id,
      username,
      projects: [],
      profile: {
        name: req.user.email.split('@')[0], // Default name from email
        bio: '',
        avatar: '',
        socialLinks: {}
      }
    });

    // Update user with username
    await User.findByIdAndUpdate(req.user._id, { username });

    res.status(201).json(newProfile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/profiles/me', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const profile = await Project.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put('/api/profiles/me', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const validTemplates = ['default', 'minimal', 'professional'];
    const { template } = req.body;

    if (template && !validTemplates.includes(template)) {
      return res.status(400).json({ message: "Invalid template" });
    }

    const updatedProfile = await Project.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { template } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(updatedProfile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Public route to get profile by username
app.get('/api/profiles/:username', async (req, res) => {
  try {
    const profile = await Project.findOne({ username: req.params.username });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add project to profile
app.post('/api/profiles/me/projects', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const profile = await Project.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.projects.push(req.body);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a project
app.put('/api/profiles/me/projects/:projectId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const profile = await Project.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const projectIndex = profile.projects.findIndex(
      p => p._id.toString() === req.params.projectId
    );

    if (projectIndex === -1) {
      return res.status(404).json({ message: "Project not found" });
    }

    profile.projects[projectIndex] = {
      ...profile.projects[projectIndex].toObject(),
      ...req.body
    };

    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a project
app.delete('/api/profiles/me/projects/:projectId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const profile = await Project.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.projects = profile.projects.filter(
      p => p._id.toString() !== req.params.projectId
    );

    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
 



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
