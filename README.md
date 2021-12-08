# Semantic Network

Update December 2021, version 0.5 has interface breaking changes (previous 0.3.x).

# Overview usage...

The resource is the primary unit of work with semantic network. Let's start with an example of loading a collection (in the context of the root of the api from the link relation '`todos`'). The resources below inherit the base classes from [`semantic link`](https://github.com/semanticlink/semanticlink-js/blob/master/src/interfaces.ts#L102).

```typescript
import { LinkedRepresentation, CollectionRepresentation } from 'semantic-link';

export interface ApiRepresentation extends LinkedRepresentation {
    // note in the links is the link relation 'todos' for the TodoCollection
}

export interface TodoRepresentation extends LinkedRepresentation {
    /**
     * A todo item name
     */
    name: string;
    /**
     * Each todo is either completed or not
     */ 
    completed: boolean;
}

export interface TodoCollection extends CollectionRepresentation<TodoRepresentation> {}
// or (depending on linting rules about empty interfaces 
export type TodoCollection = CollectionRepresentation<TodoRepresentation>
```

The next step is to synchronise the current state of the todo collection.

```typescript
// assuming the context $api is already loaded and has a link relation 'todos'

import { ApiUtil } from 'semantic-network'; 
import { LinkUtil } from 'semantic-link';
import anylogger from 'anylogger';

const log = anylogger('Todos');

// $api as a sparsely populated root
const $api: ApiRepresentation = {
    links: [
        { rel: 'Self', href: 'https://api.example.com'}
    ]   
}

// sparsely populated collections
// option one
const todos = await ApiUtil.get<TodoCollection>($api, { rel:  'todos' })
// option two
const todos: TodoCollection = await ApiUtil.get($api, { rel:  'todos' })

log.debug(LinkUtil.getUri(todos, LinkRelation.Self))
todos.items.forEach(item => log.debug(LinkUtil.get(item, LinkRelation.Self)));

// hydrated collections
await ApiUtil.get<TodoCollection>($api, { rel:  'todos', includeItems: true })
```

### Overview

Semantic network is a set of query and synchronisation utilities based on link relations through a client-side application cache when writing hypermedia clients

Semantic Network is hypermedia-API client library acting as a data mapper to application cache. Its primary purpose to allow clients to follow a trail of resources making it easy to data bind for UI-framework libraries (eg Vue, React, Angular).

Written for [level-3 HATEOUS](https://restfulapi.net/hateoas/) hypermedia-based resources, it is the equivalent of an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) relational-based entities.

It can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native, NativeScript, Expo, and Electron platforms and is desinged be used with TypeScript and JavaScript (ES5, ES6, ES7, ES8). Its goal is to always support the latest JavaScript features and provide additional features that help you to develop hypermedia clients across multiple microformats (eg ATOM, cJSON, HAL, SIREN, UBER, uri-list) - from small applications to large scale applications.

A hypermedia client implements a REST-style of architecture. As such, its primary requirement is to manage state transitions and synchronisation between the API and the client. The API returns representations of resources which the client presents to the user to act upon. The API and the client act as one state machine. As such, the library allows developers to write client code is a Data Mapper style to allow writing high quality, loosely coupled, scalable, maintainable applications.

Some key features:

* full semantic link queries - full get, put, post, delete (and patch) support
* clean resource model - schema declaration in class-based models
* clean separation of relations between resources (eg collections of collections)
* on-demand authentication
* eager and lazy relations
* breadth vs depth-first collection retrieval
* uni-directional, bi-directional and Self-referenced relations
* content negotiation aware (eg micro-formats)
* application cache expiration and refresh
* application cache persistence across sessions
* multiple application cache persistence strategies (eg local storage, firebird)
* transactions
* resource pooling
* pagination for queries
* synchronise and clone across entire networks of data/resources
* logging
* supports multiple http-layer clients (eg axios, fetch)
* support http traffic prioritisation through customisable queues
* works in NodeJS / Browser / Ionic / Cordova / React Native / NativeScript / Expo / Electron platforms
* TypeScript and JavaScript support
* produced code is performant, flexible, clean and maintainable
* follows all possible best practices

