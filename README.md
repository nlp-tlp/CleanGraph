# CleanGraph

Correcting errors in knowledge graphs constructed from textual data is a formidable challenge using conventional tools like spreadsheet software, and is even an impossibility with platforms such as Neo4J. CleanGraph emerges as the solution to this issue by providing a platform designed for the efficient management of knowledge graphs, specifically those composed of semantic triples in the format of `<head,head_type, relation, tail, tail_type>`.

CleanGraph is a robust, open-source, full-stack application that combines intuitive graph visualisation capabilities with comprehensive management features. Its frontend is built with React.js, promising a seamless, user-friendly experience with a responsive interface. Meanwhile, the backend utilises FastAPI - a cutting-edge, high-performance Python web framework, ensuring rapid and reliable application performance. For data storage, CleanGraph relies on SQLite, a lightweight, file-based database system that bolsters the application's efficiency.

Together, this powerful combination of technologies enables CleanGraph to provide swift, lightweight, and effective solutions that are compatible with various platforms. It serves as a unique tool for users who need to manage and visualise knowledge graphs with ease and precision

_Please note that CleanGraph is specifically designed for creating, reading, updating, and deleting graph elements, and it does not provide support for complex graph querying functionalities._

## Features

- **Intuitive Interface**: CleanGraph provides an easy-to-use graphical interface that lets users create, edit, review, and manage graphs with ease.
  <!-- - **Data Visualisation**: The application supports various types of data visualisations such as bar graphs, line graphs, pie charts, and more. -->
  <!-- - **Data Analysis**: CleanGraph is not just about data representation but also provides tools for data analysis. -->
- **Multi-Platform**: Works on any system that supports Python and Node.js, including Windows, macOS, and Linux.

## Installation

### Prerequisites

Before you begin, ensure you have met the following requirements:

- You have a Windows/Linux/Mac machine running Python 3.8+ and Node.js 16.15.\* (ensures the frontend can proxy to the backend, issues occur with later versions of Node).
- You have basic knowledge of Python, JavaScript, and command-line tools.

### Steps

1. Clone the repository

```bash
git clone https://github.com/4theKnowledge/CleanGraph.git
cd CleanGraph
```

2. Set up the Python FastAPI server
   Navigate to the backend directory

```bash
cd server
```

Create a Python virtual environment and activate it:

```bash
python -m venv venv
source venv/bin/activate  # For Linux/macOS
.\venv\Scripts\activate    # For Windows
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

3. Set up the React frontend
   In a new terminal, navigate to the frontend directory:

```bash
cd client
```

Install the required Node.js packages:

```bash
npm install
```

Start the React app:

```bash
npm start
```

Your application should now be running at http://localhost:3000!

## Usage

Use CleanGraph to create, manage, and analyze your graphs. Once the app is up and running, navigate to `http://localhost:3000`, here you can:

- Create new graphs
- Import existing data
- Export your graphs
- Perform complex data analysis
- And much more!

## Contributing

We encourage you to contribute to CleanGraph! Please check out the [Contributing to CleanGraph guide]() for guidelines about how to proceed.

## License

CleanGraph is licensed under the terms of the MIT License. See [LICENSE]() for more details.

## Contact

If you want to contact the maintainers, you can reach us at tyler.bikaun@research.uwa.edu.au.

We hope you find CleanGraph helpful in your data analysis and visualization tasks. Enjoy the tool, and we look forward to seeing your contributions!
