[![Build Status](https://travis-ci.org/micro-toolkit/event-bus-zeromq.svg?branch=master)](https://travis-ci.org/micro-toolkit/event-bus-zeromq)
[![Code Climate](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/gpa.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq)
[![Test Coverage](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/coverage.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/coverage)
[![Issue Count](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/issue_count.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq)
[![Dependency Status](https://gemnasium.com/badges/github.com/micro-toolkit/event-bus-zeromq.svg)](https://gemnasium.com/github.com/micro-toolkit/event-bus-zeromq)

# Micro-toolkit Event BUS

Micro-toolkit only supported REQ/REP flows, this type of flow is very useful to expose the microservices in facade API's and even used to communicate between microservices. Over time using REQ/REP patterns to choreograph the communication between microservices isn't enough. On this case a event driven approach can allow you to solve this communication in a more scalable and less complex way.

So, we are adding PUB/SUB API in Micro-toolkit that can be used for this scenarios. This API will be agnostic to the implementations. Several implementations can implement the duck type contract and be used to perform this. Since this project is using ØMQ heavily, the first reference implementation will be done using ØMQ. Later other implementations can be added.

## ØMQ Event BUS

The ØMQ implementation of event BUS will be based in the [Clone Pattern](http://zguide.ØMQ.org/py:chapter5#Reliable-Pub-Sub-Clone-Pattern), present in the ØMQ guid and from [Clustered Hashmap Protocol RFC](https://rfc.ØMQ.org/spec:12/CHP/).

**Why?**

Well we do have reference protocols and patterns on ØMQ guide, but they didn't fulfill some of the requirements and certain capabilities are not required for the use case.

This implementation will be using a centralized event bus, why? Well, fully distributed architectures can be quite complex and require a lot of other tools to accomplish it. The goal here is to keep a balance between complexity and minimal setup required. Yes, we do know that is a single point of failure, but at least we also know that the complexity of the solution is smaller and easier to reason and maintain.

To ensure a better reliability we can also apply the [Binary Star Pattern]() to have a configuration with a backup server.
