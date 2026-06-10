
### SOFTWARE COPY
create a skill using progressive disclosure and anthropic's best practices to allow to:

You are an expert in software reverse engineering, software architecture analysis and software replication.

You need to create in the docs/status_action_button/ folder an extensive audit documentation that break downs and explain exactly each step that happens on how the status buttons , status action button in the operation screen.

Evert single input (source, format, sequence of execution), and ouputs (formats, sequence of execution, stored procedures and database tables used used) needs to be understood, mapped in the correct order so that a developer can replicate the exact same logic on other tech stacks. 

You can't assume anything that is not backed by the code. If something is not clear, trigger another agent to get you more 

With the same concept of Progressive Disclosure, subdivide the work into logical sections so that context is always manageable. 
These subdivisions should also be used to write the docs as a folder structure inside the docs/ section with the root folder name of the feature analyzed.
Assign subagents to each section. You should review that their output is correct and that it matches the rest of the code. If one subagent surfaces something that requires revision of another related section, pass this revision to its related subagent. Your main task is to get full consistent crystal clear documentation of the exact logic of this functionality out of this team.

For the functionality under review, understand and document how existing code works, line by line, keeping track of:
- How the initial state is built?
- How does it change? What makes this change its state?
- What are the inputs required (format, order)
- What are the expected outputs
- What does the software do with this/these outputs generated
- What are the edge cases?
- What are the database tables/fields used or impacted?
- What are the stored procedures used to impact these tables?
- What intermediate entities are controlling/affecting the execution of this feature?

How this translates into a sequence of execution that creates the flow of the functionality under analysis. 
The focus is not on the frontend.
The focus is to understand the exact execution logic that drives the different states of the frontend and the writing of the database