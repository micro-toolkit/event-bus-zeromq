[![Build Status](https://travis-ci.org/micro-toolkit/event-bus-zeromq.svg?branch=master)](https://travis-ci.org/micro-toolkit/event-bus-zeromq)
[![Code Climate](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/gpa.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq)
[![Test Coverage](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/coverage.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/coverage)
[![Issue Count](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq/badges/issue_count.svg)](https://codeclimate.com/github/micro-toolkit/event-bus-zeromq)
[![Dependency Status](https://gemnasium.com/badges/github.com/micro-toolkit/event-bus-zeromq.svg)](https://gemnasium.com/github.com/micro-toolkit/event-bus-zeromq)

# Micro-toolkit Event BUS

Micro-toolkit only supported REQ/REP flows, this type of flow is very useful to expose the microservices in facade API's and even used to communicate between microservices. Over time using REQ/REP patterns to choreograph the communication between microservices isn't enough. On this case a event driven approach can allow you to solve this communication in a more scalable and less complex way.

So, we are adding PUB/SUB API in Micro-toolkit that can be used for this scenarios. This API will be agnostic to the implementations. Several implementations can implement the duck type contract and be used to perform this. Since this project is using ØMQ heavily, the first reference implementation will be done using ØMQ. Later other implementations can be added.

## ØMQ Event BUS

The ØMQ implementation of event BUS will be based in the [Clone Pattern](http://zguide.zeromq.org/py:chapter5#Reliable-Pub-Sub-Clone-Pattern), present in the ØMQ guid and from [Clustered Hashmap Protocol RFC](https://rfc.zeromq.org/spec:12/CHP/).

**Why?**

Well we do have reference protocols and patterns on ØMQ guide, but they didn't fulfill some of the requirements and certain capabilities are not required for the use case.

This implementation will be using a centralized event bus, why? Well, fully distributed architectures can be quite complex and require a lot of other tools to accomplish it. The goal here is to keep a balance between complexity and minimal setup required. Yes, we do know that is a single point of failure, but at least we also know that the complexity of the solution is smaller and easier to reason and maintain.

To ensure a better reliability we can also apply the [Binary Star Pattern](http://zguide.zeromq.org/page:all#High-Availability-Pair-Binary-Star-Pattern) to have a configuration with a backup server.

## Give it a try

To run the examples using docker use the following:

    $ docker-compose up

This will run the event bus and simple subscriber and publisher, the publisher sends a message every second.

## Install

    $ npm i micro-toolkit-event-bus-zeromq --save

## Event Publisher

The event publisher allows you to publish events into the event bus. You can use a programatic interface or the command line tool.

### Library

    var config = {
      // optional, this is the default address
      address: 'tcp://127.0.0.1:5558',
      producerId: 'someproducer'
    }
    var bus = require('micro-toolkit-event-bus-zeromq')
    var publisher = bus.getPublisher(config)

    publisher.send('/example/topic', "somedata")

### Command line tool

Sending a new event every 1s

    $ bin/publisher -t /examples/producer -i 1000 something

Help command is available

    $ bin/publisher --help

    Usage:

    $ bin/publisher -a tcp://127.0.0.1:5558 -p command_line_producer -t /examples/producer -i 1000 random data"

     -a: Event Bus Address
     -p: Producer identifier
     -t: Topic used to publish events
     -i: Publish interval (in ms)

### Command line using global install

   $ npm i micro-toolkit-event-bus-zeromq -g

   $ micro-pub

## Event Subscriber

The event subscriber allows you to subscribe events from the event bus. You can use a programatic interface or the command line tool.

### Library

    var config = {
      // optional, it will use address - 1 when not specified
      snapshot: 'tcp://127.0.0.1:5556',
      // optional, default value is tcp://127.0.0.1:5557
      address: 'tcp://127.0.0.1:5557',
      // optional
      store: { path: '/tmp/sequence.dump' }
    }
    var bus = require('micro-toolkit-event-bus-zeromq')
    var subscriber = bus.getSubscriber(config)

    // subscriber topics
    subscriber.on('/example/topic', function(data){
      console.log('Topic /example/topic received => %j', data)
    })
    subscriber.on('/example', function(data){
      console.log('Topic /example received => %j', data)
    })

    // start receiving events
    subscriber.connect()

### Command line tool

Receive events from topic '/examples'

    $ bin/subscriber -t /examples

Help command is available

    $ bin/subscriber --help

    Usage:

    With default values
    $ bin/subscriber

    With debug level
    $ bin/subscriber --debug

    With parameters
    $ bin/subscriber -s tcp://127.0.0.1:5556 -a tcp://127.0.0.1:5557 -t /examples

     -s: Event Bus Snapshot Address
     -a: Event Bus Address
     -t: Topics to subscribe events (eg: /a/b,/ac)

### Command line using global install

   $ npm i micro-toolkit-event-bus-zeromq -g

   $ micro-sub

## Event BUS

The event subscriber allows you to subscribe events from the event bus. You can use a programatic interface or the command line tool.

### Library

    var config = {
      // optional, it will use publisher - 1 when not specified
      snapshot: 'tcp://127.0.0.1:5556',
      // optional, default value is tcp://127.0.0.1:5557
      publisher: 'tcp://127.0.0.1:5557',
      // optional, it will use publisher + 1 when not specified
      collector: 'tcp://127.0.0.1:5558'
    }
    var busFactory = require('micro-toolkit-event-bus-zeromq')
    var bus = busFactory.getInstance(config)
    bus.connect()

    function close() {
      bus.close()
      process.exit()
    }

    process.on('SIGINT', close)

### Command line

Start BUS

    $ bin/bus

Help command is available

    $ bin/bus --help

    Usage:

    With default values
    $ bin/bus

    With debug level
    $ bin/bus --debug

    With parameters
     $ bin/bus -s tcp://127.0.0.1:5556 -p tcp://127.0.0.1:5557 -c tcp://127.0.0.1:5558 -f /tmp/bus_sequence.dump -u mongodb://localhost/event_bus

      -s: Event Bus Snapshot Address
      -p: Event Bus Publisher Address
      -c: Event Bus Collector Address
      -f: Event Bus Sequence storage fullpath
      -u: Event Bus db url

### Command line using global install

   $ npm i micro-toolkit-event-bus-zeromq -g

   $ micro-bus

### Command line using environment variables

    $ MICRO_BUS_SNAPSHOT=tcp://127.0.0.1:5556 MICRO_BUS_PUBLISHER=tcp://127.0.0.1:5557 MICRO_BUS_COLLECTOR=tcp://127.0.0.1:5558 MICRO_BUS_SEQ_PATH=/tmp/bus_sequence.dump MICRO_BUS_DB_URI=mongodb://localhost/event_bus bin/bus
