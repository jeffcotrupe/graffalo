
import request from 'request-promise';

const makeRequest = request.defaults({
  baseUrl: 'http://localhost:3030',
  json: true
});

export default function Resolvers(){

    let app = this;

    // GraphQL Resolvers are used to compose app state via 
    // FeathersJS-based, data-oriented microservices 
    //
    // We have one microservice per db collection or table 
    //
    // We compose app state via Resolvers in the mid tier rather than implement relational 
    // joins in the database. This assures app logic is entirely defined in Javascript 
    // within the Resolvers, not in the db query language (SQL, Mongo NoSQL, etc)

    return {

      // Query and Mutation Resolvers
      
      // Query Resolvers (return output types)
      // args are defined in schema in RootQuery and RootMutation

      // These Resolvers are invoked by the GraphQL server to resolve the query
      // In turn they invoke Feathers services, passing them context {provider, token} 
      // and CRUD/find params where applicable

      RootQuery: {
        viewer(root, args, context) {
            // returns User type 
            let Viewer = app.service('/viewer');
            return new Promise(function(resolve, reject) {
              // pass context as params with empty query
              Viewer
                .find(context)
                .then((user) => resolve(user))
                .catch((err) => reject(err))
            })
        },
        user(root, args, context){
          // returns User type
          let Users = app.service('/users');
          return new Promise(function(resolve, reject) {
            Users.find({
              query: {
                _id: args._id
              },
              ...context
            })
            .then((users) => resolve(users[0]))
            .catch((err) => reject(err))
          })
        },
        users(root, args, context){
          // returns [User] type 
          let Users = app.service('/users');
          return new Promise(function(resolve, reject) {
            // pass context as params with empty query
            Users
              .find(context)
              .then((user) => resolve(user))
              .catch((err) => reject(err))
          })
        },
        item(root, { _id }, context){
          // returns Item type
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items
              .get(_id, context)
              .then((item) => resolve(item))
              .catch((err) => reject(err))
          })
        },
        items(root, { menuCategory }, context){
          // returns [Item] type 
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory
              },
              ...context
            })
            .then((item) => resolve(item))
            .catch((err) => reject(err))
          })
        },
        allItems(root, args, context){
          // returns [Item] type
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            // pass context as params with empty query
            Items
              .find(context)
              .then((item) => resolve(item))
              .catch((err) => reject(err))
          })
        },
        order(root, args, context){
          // returns Order type 
          let Orders = app.service('/orders')
          return new Promise(function(resolve, reject) {
            Orders
              .get(args._id, context)
              .then((order) => resolve(order))
              .catch((err) => reject(err))
          })
        },
        allOrders(root, args, context){
          // returns [Order] type 
          let Orders = app.service('/orders');
          return new Promise(function(resolve, reject) {
            // pass context as params with empty query
            Orders
              .find(context)
              .then((order) => resolve(order))
              .catch((err) => reject(err))
          })
        },
        menu(root, args, context){
          // returns Menu type
          // menu doesn't exist in db and is made entirely of sub-types
          // so we just resolve with empty object and drill down on sub-types
          return Promise.resolve({})
        }
      },

      // Mutation Resolvers (return output type from mutation)
      // args are defined in schema 
      RootMutation: {
        signUp(root, args, context){
          // returns User type
          let Users = app.service('/users');
          return new Promise(function(resolve, reject) {
            Users
              .create(args)
              .then((user) => resolve(user))
              .catch((err) => reject(err))
          })
        },
        logIn(root, {username, password}, context){
          // returns AuthPayload
          return new Promise(function(resolve, reject) {
            makeRequest({
              uri: '/auth/local',
              method: 'POST',
              body: { username: username, password: password }
            })
            .then((result) => resolve(result))
            .catch((err) => reject(err))
          })
        },
        createItem(root, args, context){
          // returns Item type
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
                Items
                  .create(args.item, context)
                  .then((item) => resolve(item))
                  .catch((err) => reject(err))
          })
        },
        editItem(root, args, context){
          // returns Item type
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items
              .patch(args._id, args.item, context)
              .then((item) => resolve(item))
              .catch((err) => reject(err))
            })
        },
        removeItem(root, args, context){
          // returns Item type
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items
            .remove(args._id, context)
            .then((item) => resolve(item))
            .catch((err) => reject(err))
          })
        },
        createOrder(root, args, context){
          // returns Order type
          let Orders = app.service('/orders');
          let Users = app.service('/users');
          let Items = app.service('/items');

          return new Promise(function(resolve, reject) {
              Items.find({
                query: 
                    {_id: 
                      {
                        $in: args.order.itemIds 
                      }
                    },
                ...context
              }).then((items) => {
                  let total = `$${items.reduce((sum, item) => {
                                return sum + Number(item.itemPrice.slice(1))
                                }, 0)}`

                  args.order.total = total

                  Orders
                    .create(args.order, context)
                    .then((order) => {
                      Users
                        .update(order.userId, { $push: { orderIds: order._id } }, context)
                        .then((user) => {
                          resolve(order)
                        })
                        .catch((err) => reject(err))
                    }).catch((err) => reject(err)) 
              }).catch((err) => reject(err))
          })
        }
      },

      // Sub-type resolvers for the output types from Query and Mutation Resolvers (above)
      // The output type is passed into the first param of each resolver function
      // The args are defined in the schema
      // The context is derived from the request header in server/services/graphql/index.js

      // we wrap promise-returning Feathers service methods in another promise because sometimes
      // those methods encounter an unhandled exception and/or explicitly throw an error as opposed 
      // to properly rejecting the promise (by handling the exception and/or rejecting instead of 
      // throwing an error.) 
      //
      // For more context, see e,g.:           
      // http://2ality.com/2016/03/promise-rejections-vs-exceptions.html 

      // Services in Sub-Type Resolvers are invoked by the GraphQL service not the Client
      //
      // This means that hooks can be bypassed and we don't need to pass context again
      //
      // If you do pass context again it will trigger the hooks on for the sub-types too
      // so don't do it unless you have logic other than authentication/authorization 
      // that you wish to run, but then that would be going against this architecture 
      // where we keep all business logic other than authentication and authorization/roles
      // in the GraphQL resolvers

      User: {
        favoriteItems(user, args, context){
          let Items = app.service('/items');
          // get all the items in user's favorited items
            return new Promise(function(resolve, reject) {
              Items.find({
                query: {
                  _id: {
                    $in: user.favoriteItemsIds
                  },
                }
              })
              .then((item) => resolve(item))
              .catch((err) => resolve(err))
            })
        },
        orders(user, args, context){
          let Orders = app.service('/orders');
          return new Promise(function(resolve, reject) {
              Orders.find({
                query: {
                  _id: {
                    $in: user.orderIds
                  }
                }
              })
              .then((order) => resolve(order))
              .catch((err) => reject(err))
          })
        },
        pendingOrders(user, args, context){
          let Orders = app.service('/orders');
          return new Promise(function(resolve, reject) {
            Orders.find({
              query: {
                _id: {
                  $in: user.orderIds
                }
              }
            })
            .then((orders) => resolve(orders.filter((order) => !order.fulfilled)))
            .catch((err) => reject(err))
          })
        }
      },
      Item: {
        sides(item, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: 
                  {_id: 
                    {
                      $in: item.sideIds
                    }
                  }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        },
        upsells(item, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: 
                  {_id: 
                    {
                      $in: item.upsellIds 
                    }
                  }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        }
      },
      Order: {
        user(order, args, context){
          let Users = app.service('/users');
          return Users.get(order.userId, context)
        },
        items(order, args, context){
          let Items = app.service('/items')
          return new Promise(function(resolve, reject) {
            Items.find({
              query: 
                  {_id: 
                    {
                      $in: order.itemIds 
                    }
                  }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        }
      },
      // you would have to add ...context to find if Menu needed autnentication
      Menu: {
        entrees(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "ENTRE"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        },
        sides(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "SIDE"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err)) 
          }) 
        },
        appetizers(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "APPETIZER"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        },
        deserts(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "DESERT"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        },
        drinks(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "DRINK"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        },
        upsells(menu, args, context){
          let Items = app.service('/items');
          return new Promise(function(resolve, reject) {
            Items.find({
              query: {
                menuCategory: "UPSELL"
              }
            })
            .then((items) => resolve(items))
            .catch((err) => reject(err))
          })
        }
      },
      AuthPayload : {
        data(auth, args, context) {
          return Promise.resolve(auth.data);
        }
      }

  }
}

