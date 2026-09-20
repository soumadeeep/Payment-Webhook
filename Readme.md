# High-Throughput Fintech Payment Webhook & Ledger Pipeline

An event-driven, fault-tolerant backend system designed to ingest high-volume, asynchronous payment webhooks, guarantee at-least-once delivery, prevent duplicate financial transactions, and maintain an immutable double-entry ledger.

## Core Architectural Highlights

* **Fast-ACK Ingestion (<15ms):** Decouples HTTP request ingestion from database execution. Verifies HMAC-SHA256 signatures directly on raw byte streams before publishing to RabbitMQ and returning HTTP 202 Accepted.
* **Backpressure Management:** Absorbs sudden webhook traffic bursts into durable RabbitMQ queues, allowing background consumer workers to process at a sustainable throughput using explicit channel `prefetch` limits.
* **Dual-Layer Idempotency Guard:** Eliminates duplicate charges and ledger corruption caused by gateway retries:
  * **In-Memory Guard:** Redis atomic locks (`SETNX` with TTL) for fast, concurrent deduplication.
  * **Relational Source of Truth:** MySQL unique constraints on event IDs within ACID transactions.
* **Out-of-Order Handling & Finite State Machine (FSM):** Uses pessimistic row locks (`SELECT ... FOR UPDATE`) and an FSM engine to ensure out-of-order events (e.g., late-arriving initiation events) cannot overwrite terminal or advanced states.
* **Double-Entry Ledger Accounting:** Stores immutable audit lines inside atomic transactions where debits to platform escrow accounts strictly equal credits to merchant balances ($\sum \text{Debits} == \sum \text{Credits}$).
* **Edge Security Ready:** Designed to sit behind Cloudflare/WAF for edge rate limiting and DDoS mitigation.

## Tech Stack
* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js
* **Message Broker:** RabbitMQ (`amqplib` ConfirmChannel)
* **Cache / Distributed Locks:** Redis (`ioredis`)
* **Database & ORM:** MySQL, Sequelize

## Main Architecture
<img width="1902" height="1920" alt="image" src="https://github.com/user-attachments/assets/81c19f60-b065-46cd-a180-7decc49d33c8" />

## Mental Model
<img width="2984" height="906" alt="image" src="https://github.com/user-attachments/assets/3b43eb4b-4654-42b0-b95a-8a9c4cb73fce" />


