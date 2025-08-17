# LegalX - Legal Advisory Management System

## Description

LegalX is a Python-based Legal Advisory Management System designed to streamline and manage legal advisory processes. This system aims to provide tools for organizing legal information, managing cases, and facilitating communication within a legal team.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- **API Functionality**: Utilizes `api_2.py` to provide API endpoints for managing legal data.
- **Vector Store**: Implements a vector store using `built_vector_store.py` for efficient information retrieval.
- **Dependency Management**: Uses `requirements.txt` to manage project dependencies.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/askchandan/LegalX.git
    cd LegalX
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Linux/macOS
    venv\Scripts\activate  # On Windows
    ```

3.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

## Usage

1.  **Data Preparation:**

    Before building the vector store, you need to create a folder named `data` in the root directory of the project. Place all the PDF files that you want to include in the vector store inside this `data` folder.

    ```
    LegalX/
    ├── data/
    │   ├── document1.pdf
    │   ├── document2.pdf
    │   └── ...
    ├── api_2.py
    ├── built_vector_store.py
    ├── requirements.txt
    └── ...
    ```

2.  **Building the Vector Store:**

    To build the vector store, execute the `built_vector_store.py` script:

    ```bash
    python built_vector_store.py
    ```

    This script will process the PDF files in the `data` folder and set up the vector store for efficient information retrieval.

3.  **Running the API:**

    To start the API, execute the `api_2.py` script:

    ```bash
    python api_2.py
    ```

    Ensure that all dependencies are installed and the environment is properly configured before running the script.


## Contributing

Contributions are welcome! Here's how you can contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive commit messages.
4.  Push your changes to your fork.
5.  Submit a pull request to the main repository.

## License

This project does not currently have a license. All rights are reserved by the owner.