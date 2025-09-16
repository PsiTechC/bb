import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { withCORS } from "../../../../middleware/cors";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

function generateRandomPassword(length = 8) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

async function addClient(req) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return new Response(JSON.stringify({ message: "Name and Email are required" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Prevent duplicate user
    const exists = await db.collection("clients").findOne({ email });
    if (exists) {
      client.close();
      return new Response(JSON.stringify({ message: "Client already exists" }), { status: 409 });
    }

    // Step 2: Generate password and hash
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Step 3: Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"Eulerianbots" <${user}>`,
      to: email,
      subject: `Your have access to DoorSense`,
      text: `Welcome to the DoorSense platform!

You have been added as a DoorSense Client.

Login Email: ${email}
Temporary Password: ${plainPassword}

Please log in and change your password after first login.

Regards,
Eulerianbots Team`,
      html: `
        <p>Welcome to the <strong>DoorSense</strong> platform!</p>
        <p>You have been added as a <strong>DoorSense Client</strong></p>
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        <p>Please log in and change your password after first login.</p>
        <br/>
        <p>Regards,<br/>Eulerianbots Team</p>
      `,
    };

    const mailResult = await transporter.sendMail(mailOptions);
    if (!mailResult.accepted.includes(email)) {
      client.close();
      return new Response(JSON.stringify({ message: "Failed to send email" }), { status: 500 });
    }

    // Step 4: Insert user as client
    await db.collection("clients").insertOne({
      name,
      email,
      password: hashedPassword,
      role: "client",
      createdAt: new Date(),
    });

    client.close();
    return new Response(JSON.stringify({ message: "Client created and email sent" }), { status: 201 });

  } catch (err) {
    console.error("Error creating client:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(addClient);
