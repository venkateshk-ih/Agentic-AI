The "Agentic AI Tester" capstone project requires the development of a multi-agent system designed to automate test script generation from documentation.

System Architecture and Agents

The system consists of three distinct agents working in a coordinated workflow:
Agent A (Requirement Extractor): Responsible for extracting testable requirements directly from a PDF file.
Agent B (Code Generator): Generates Playwright code based on the requirements identified by Agent A.
Agent C (Quality Assurance): Analyzes the generated code for hallucinations, missing scripts, edge cases, and overall test coverage sufficiency. It provides a report and confirmation to fix any identified issues.
Solution Expectations
Frameworks: The solution must be built using an Agentic AI framework such as ADK or LangGraph.
Iterative Refinement: If Agent C identifies issues, Agent B must not regenerate the entire script; it should only fix the missing or incorrect portions. This loop can occur for a maximum of five attempts.
Execution and Adaptability:
Generated Playwright scripts must be executable in an IDE, with locators matching the UI elements of the provided URL.
The system must dynamically update scripts if a different requirements document with a new URL is provided.
RAG Implementation

The project suggests using EmbeddingGemma for Retrieval Augmented Generation (RAG).
Model Characteristics: It is a lightweight (308M parameters) open model designed for on-device use (phones, laptops, desktops).
Capabilities: Supports over 100 languages and provides customizable output dimensions (128 to 768) to balance speed and quality.
Benefits: Ideal for privacy-sensitive applications as data remains on the user's hardware.