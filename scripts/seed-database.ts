import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

// This script will seed the database with initial data for testing
// Run with: npx ts-node scripts/seed-database.ts

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set")
  process.exit(1)
}

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

async function seedDatabase() {
  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("swiftride")

    // Clear existing data
    await db.collection("users").deleteMany({})
    await db.collection("buses").deleteMany({})
    await db.collection("routes").deleteMany({})
    await db.collection("bookings").deleteMany({})

    console.log("Cleared existing data")

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10)
    const adminUser = {
      name: "Admin User",
      email: "admin@swiftride.com",
      password: adminPassword,
      role: "admin",
      createdAt: new Date(),
    }

    const adminResult = await db.collection("users").insertOne(adminUser)
    console.log("Created admin user:", adminResult.insertedId.toString())

    // Create driver users
    const drivers = [
      {
        name: "John Driver",
        email: "john@swiftride.com",
        password: await bcrypt.hash("driver123", 10),
        role: "driver",
        phone: "555-123-4567",
        licenseNumber: "DL12345678",
        status: "available",
        createdAt: new Date(),
      },
      {
        name: "Sarah Driver",
        email: "sarah@swiftride.com",
        password: await bcrypt.hash("driver123", 10),
        role: "driver",
        phone: "555-987-6543",
        licenseNumber: "DL87654321",
        status: "available",
        createdAt: new Date(),
      },
    ]

    const driverResult = await db.collection("users").insertMany(drivers)
    console.log(
      "Created driver users:",
      Object.values(driverResult.insertedIds).map((id) => id.toString()),
    )

    // Create passenger users
    const passengers = [
      {
        name: "Alice Passenger",
        email: "alice@example.com",
        password: await bcrypt.hash("pass123", 10),
        role: "passenger",
        createdAt: new Date(),
      },
      {
        name: "Bob Passenger",
        email: "bob@example.com",
        password: await bcrypt.hash("pass123", 10),
        role: "passenger",
        createdAt: new Date(),
      },
    ]

    const passengerResult = await db.collection("users").insertMany(passengers)
    console.log(
      "Created passenger users:",
      Object.values(passengerResult.insertedIds).map((id) => id.toString()),
    )

    // Create buses
    const buses = [
      {
        registrationNumber: "BUS-001",
        model: "Mercedes Sprinter",
        capacity: 20,
        currentLocation: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        lastUpdated: new Date(),
      },
      {
        registrationNumber: "BUS-002",
        model: "Ford Transit",
        capacity: 15,
        currentLocation: { lat: 37.7833, lng: -122.4167 }, // San Francisco
        lastUpdated: new Date(),
      },
      {
        registrationNumber: "BUS-003",
        model: "Toyota Coaster",
        capacity: 25,
        currentLocation: { lat: 37.7694, lng: -122.4862 }, // San Francisco
        lastUpdated: new Date(),
      },
    ]

    const busResult = await db.collection("buses").insertMany(buses)
    const busIds = Object.values(busResult.insertedIds).map((id) => id.toString())
    console.log("Created buses:", busIds)

    // Create routes
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const routes = [
      {
        name: "Downtown Express",
        origin: "Downtown Station",
        destination: "Airport Terminal",
        departureTime: new Date(tomorrow.setHours(8, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(9, 30, 0, 0)),
        fare: 12.5,
        availableSeats: 20,
        busId: busIds[0],
        driverId: driverResult.insertedIds[0].toString(),
        stops: [
          {
            name: "Downtown Station",
            arrivalTime: new Date(tomorrow.setHours(8, 0, 0, 0)),
            departureTime: new Date(tomorrow.setHours(8, 5, 0, 0)),
            coordinates: { lat: 37.7749, lng: -122.4194 },
          },
          {
            name: "City Center",
            arrivalTime: new Date(tomorrow.setHours(8, 20, 0, 0)),
            departureTime: new Date(tomorrow.setHours(8, 25, 0, 0)),
            coordinates: { lat: 37.7833, lng: -122.4167 },
          },
          {
            name: "Airport Terminal",
            arrivalTime: new Date(tomorrow.setHours(9, 30, 0, 0)),
            departureTime: new Date(tomorrow.setHours(9, 35, 0, 0)),
            coordinates: { lat: 37.7694, lng: -122.4862 },
          },
        ],
        createdAt: new Date(),
      },
      {
        name: "Coastal Route",
        origin: "Beach Station",
        destination: "Mountain View",
        departureTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(11, 45, 0, 0)),
        fare: 15.0,
        availableSeats: 15,
        busId: busIds[1],
        driverId: driverResult.insertedIds[1].toString(),
        stops: [
          {
            name: "Beach Station",
            arrivalTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
            departureTime: new Date(tomorrow.setHours(10, 5, 0, 0)),
            coordinates: { lat: 37.8083, lng: -122.4156 },
          },
          {
            name: "Coastal Highway",
            arrivalTime: new Date(tomorrow.setHours(10, 45, 0, 0)),
            departureTime: new Date(tomorrow.setHours(10, 50, 0, 0)),
            coordinates: { lat: 37.8199, lng: -122.4783 },
          },
          {
            name: "Mountain View",
            arrivalTime: new Date(tomorrow.setHours(11, 45, 0, 0)),
            departureTime: new Date(tomorrow.setHours(11, 50, 0, 0)),
            coordinates: { lat: 37.4133, lng: -122.1162 },
          },
        ],
        createdAt: new Date(),
      },
    ]

    // Update driver status and assigned route
    await db
      .collection("users")
      .updateOne({ _id: driverResult.insertedIds[0] }, { $set: { status: "on_duty", assignedRouteId: routes[0]._id } })

    await db
      .collection("users")
      .updateOne({ _id: driverResult.insertedIds[1] }, { $set: { status: "on_duty", assignedRouteId: routes[1]._id } })

    const routeResult = await db.collection("routes").insertMany(routes)
    const routeIds = Object.values(routeResult.insertedIds).map((id) => id.toString())
    console.log("Created routes:", routeIds)

    // Create bookings
    const bookings = [
      {
        userId: passengerResult.insertedIds[0].toString(),
        routeId: routeIds[0],
        routeName: routes[0].name,
        origin: routes[0].origin,
        destination: routes[0].destination,
        departureTime: routes[0].departureTime,
        arrivalTime: routes[0].arrivalTime,
        fare: routes[0].fare,
        passengers: 1,
        status: "confirmed",
        isPaid: false,
        createdAt: new Date(),
      },
      {
        userId: passengerResult.insertedIds[1].toString(),
        routeId: routeIds[1],
        routeName: routes[1].name,
        origin: routes[1].origin,
        destination: routes[1].destination,
        departureTime: routes[1].departureTime,
        arrivalTime: routes[1].arrivalTime,
        fare: routes[1].fare,
        passengers: 2,
        status: "confirmed",
        isPaid: true,
        paymentId: "sample_payment_id",
        paymentStatus: "completed",
        paidAt: new Date(),
        createdAt: new Date(),
      },
    ]

    const bookingResult = await db.collection("bookings").insertMany(bookings)
    console.log(
      "Created bookings:",
      Object.values(bookingResult.insertedIds).map((id) => id.toString()),
    )

    // Update available seats on routes
    await db.collection("routes").updateOne({ _id: routeResult.insertedIds[0] }, { $inc: { availableSeats: -1 } })

    await db.collection("routes").updateOne({ _id: routeResult.insertedIds[1] }, { $inc: { availableSeats: -2 } })

    console.log("Database seeded successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
    console.log("Disconnected from MongoDB")
  }
}

seedDatabase()

