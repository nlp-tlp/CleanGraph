# Getting Started

CleanGraph can be set up on both Windows and Linux systems. The following instructions will guide you through the setup process on both operating systems.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have a Windows/Linux/Mac machine running Python 3.8+ and Node.js 16.15.\* (ensures the frontend can proxy to the backend, issues occur with later versions of Node).
- You have basic knowledge of Python, JavaScript, and command-line tools.

## Project layout

    client/                     # Javascript React Client.
    public/
    src/
    package.json            # Client dependencies.
    docs/                       # Documentation files.
        mkdocs.yml              # Documentation configuration file.
        docs/                   # Markdown pages, assets, etc.
    server/                     # Python FastAPI Server.
        requirements.txt        # Server dependencies.
        models/
        plugins/
        routers/
        services/
    CODE_OF_CONDUCT.md          # Contributor Code of Conduct.
    CONTRIBUTING.md             # Contribution Guidelines.
    LICENSE.md                  # MIT License.
    README.md                   # General ReadMe.

## Step 1: Clone the GitHub Repository

First, clone the CleanGraph repository to your local machine:

```bash
git clone https://github.com/nlp-tlp/CleanGraph
```

## Step 2: Setup the Client

Navigate into the `client/` directory. Install the client dependencies by running:

```bash
npm install
```

## Step 3: Setup the Server

Navigate to the `server/` directory. Here, set up a Python virtual environment and install the server dependencies.

**For Windows:**

Create a virtual environment called `venv`:

```bash
python -m venv venv
```

Activate the virtual environment:

```bash
.\venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r .\requirements.txt
```

**For Linux:**

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file with the following structure - this is used to connect to the MongoDB database:

> If you are not familiar with MongoDB - visit [here](https://www.mongodb.com/basics/create-database) to create a new database.

```bash
PORT=8000

MONGO_DB_USERNAME="<YOUR_MONGO_DB_USERNAME>"
MONGO_DB_PASSWORD="<YOUR_MONGO_DB_PASSWORD>"
MONGO_CLUSTER_NAME="<YOUR_MONGO_DB_CLUSTER_NAME>"
MONGO_DB_NAME="<YOUR_MONGO_DB_NAME>"
MONGO_URI="mongodb+srv://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@${MONGO_CLUSTER_NAME}.0aum8fo.mongodb.net/${MONGO_DB_NAME}?retryWrites=true&w=majority"
```

## Step 4: Run CleanGraph

Once the setup is complete, start the client and server separately.

To start the client, navigate to the `client/` directory and run:

```bash
npm start
```

This will start the client on `http://localhost:3000`

To start the server, make sure the virtual environment is activated, navigate to the `server/` directory, and run:

```bash
uvicorn main:app
```

This will start the server on `http://localhost:8000`

After completing these steps, you should now have CleanGraph up and running on your machine.

## Step 5: Optional - Setup the Documentation Site

If you wish to have the documentation site available locally, you can set it up by following these steps:

1. Navigate to the `docs/` directory in your terminal.
2. Set up a new Python virtual environment.

**For Windows:**

```bash
python -m venv venv

```

**For Linux:**

```bash
python3 -m venv venv
```

3. Activate the newly created virtual environment.

**For Windows:**

```bash
.\venv\Scripts\activate
```

**For Linux:**

```bash
source venv\bin\activate
```

4. Install the necessary dependencies.

```bash
pip install -r requirements.txt
```

5. Run the documentation site server using MkDocs.

```bash
mkdocs server -a 0.0.0.0:8001
```

Upon completion of these steps, the documentation site should be available at `http://localhost:8001`. You can navigate the documentation through your web browser while the MkDocs server is running.
