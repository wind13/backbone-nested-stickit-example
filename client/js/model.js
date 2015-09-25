(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("underscore"), require("backbone"));
	else if(typeof define === 'function' && define.amd)
		define(["underscore", "backbone"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("underscore"), require("backbone")) : factory(root["_"], root["Backbone"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _ = __webpack_require__(1);
	var Backbone = __webpack_require__(2);
	var helpers = __webpack_require__(3);

	/**
	 * Creates a hierarchical model, allowing properties to be cast via an object passed to this.schema.
	 *
	 */
	module.exports = Backbone.Model.extend({

	    // The structure of any nested models/collections,
	    // defined as an object of key: value pairs.
	    // The key refers to the model attribute and
	    // value is the class that will be cast to.
	    // For example:
	    // schema: {
	    //      items: Backbone.Collection,
	    // }
	    schema: {},

	    // References to the nested child instances. Equivalent to model.attributes
	    children: null,

	    constructor: function (attributes, options) {
	        options || (options = {});
	        options.parse = true;
	        this.children = {};
	        Backbone.Model.call(this, attributes, options);
	    },

	    // Iterate through the models schema, casting each property to the appropriate class.
	    parse: function (response) {
	        // Return the parsed response with the mapped schema
	        var keys = _.keys(this.schema);
	        var mappedResponse = _.reduce(keys, _.bind(this.mapSchema, this), response);
	        return mappedResponse;
	    },

	    mapSchema: function (response, key) {
	        var EmbeddedClass, data, instance;
	        data = response[key];
	        if (!data && this.defaults && this.defaults[key]) {
	            data = _.clone(this.defaults[key]);
	        }

	        if (data) {
	            // Get a reference to the class defined in the schema
	            EmbeddedClass = this.schema[key];

	            // Create an instance of the class type.
	            instance = new EmbeddedClass(data);

	            // Listen for all events on the embedded models
	            instance.on('all', function (name) {
	                var args = _.rest(Array.prototype.slice.call(arguments, 0), 1);
	                var newArgs = [].concat([helpers.modifyEvent(name, key)], args);
	                this.trigger.apply(this, newArgs);

	                // If the child is destroyed, don't send a 'destroy' event from this model.
	                if( name === 'destroy'){
	                    return;
	                }
	                // if the event is namespaced from a child, trigger the event from this model too
	                else if( name.indexOf(':') === -1) {
	                    this.trigger.apply(this, [].concat([name], args));
	                }
	            }, this);

	            instance.on('change', function(d) {
	                this.attributes[key] = _.clone(d.attributes);
	                this.changed[key] = d.changed;
	            }, this);

	            instance.on('destroy', function(d) {
	                delete this.attributes[key];
	                delete this.schema[key];
	            }, this);

	            // Add the instance to the response.
	            this.children[key] = instance;
	            response[key] = instance.toJSON();
	        }

	        return response;
	    },

	    get: function (attr) {
	        return helpers.getChildAttribute(attr, this.children) || this.attributes[attr];
	    },

	    set: function (key, val, options) {
	        var attrs, keys, child, context, attributes, prop;
	        if (key === null) {
	            return this;
	        }

	        if (typeof key === 'object') {
	            attrs = key;
	            options = val;
	        }
	        else {
	            (attrs = {})[key] = val;
	        }

	        options || (options = {});

	        var changes = {};

	        for (prop in attrs) {
	            keys = helpers.getChildKey(prop);
	            child = helpers.getChild(keys.key, this.children);
	            context = child;
	            attributes = attrs[prop];

	            // Check if the attribute has a dot or square bracket
	            if( prop.indexOf('.') !== -1 || prop.indexOf('[') !== -1){
	                context = helpers.getChildContext(child, keys.relativeKey, attributes);
	                context.child.set(context.values, options);

	                // Delete the key to prevent attribute keys like "myColl[0]"
	                delete attrs[prop];

	                // update the nested attributes value
	                attrs[keys.key] = child.toJSON();
	                if(context.child.collection) {
	                    changes[keys.key] = [context.child.changed];
	                } else {
	                    changes[keys.key] = context.child.changed;
	                }

	                options.unset = false;
	            }
	            else {
	                // If the instance does not exist for the key, create it.
	                if (!this.children.hasOwnProperty(prop) && this.schema.hasOwnProperty(prop)) {
	                    var InstanceFactory = this.schema[prop];
	                    this.children[prop] = new InstanceFactory();
	                }

	                // If the property exists in the children array, treat it as a model or collection respectively
	                if (this.children.hasOwnProperty(prop)) {
	                    child = this.children[prop];
	                    var values = _.clone(attrs[prop]);
	                    if (child instanceof Backbone.Collection) {
	                        // If the attribute is a collection, reset it to the new values
	                        child.reset(values);
	                        changes[prop] = _.clone(values);
	                    }
	                    else {
	                        child.set(values, options);
	                        changes[prop] = child.changed;
	                    }


	                    if (values !== null || typeof values === 'undefined') {
	                        options.unset = false;
	                    }
	                    else if (options.unset === true) {
	                        delete this.children[prop];
	                    }

	                    attrs[prop] = child.toJSON();
	                }
	            }
	        }

	        var result = Backbone.Model.prototype.set.apply(this, [attrs, options]);

	        this.changed = _.extend({}, this.changed, changes);

	        return result;
	    },

	    toJSON: function () {
	        var res, key;

	        res = Backbone.Model.prototype.toJSON.apply(this, arguments);

	        // Iterate through the models children, calling toJSON on each cast instance.
	        for (key in this.children) {
	            // Call toJSON on the nested schema
	            res[key] = this.children[key].toJSON();
	        }

	        // Return the json response.
	        return res;
	    },

	    validate: function (attributes, options) {
	        return helpers.validateInSchema.apply(this, arguments);
	    }

	});


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _ = __webpack_require__(1);
	var Backbone = __webpack_require__(2);

	exports.modifyEvent = function (name, key) {
		var names = name.split(':');
	    // inject "key" into the event name after the event type.
	    // eg. "change:foo" becomes `change:${key}:foo`
	    return [].concat([names[0], key], _.rest(names, 1)).join(':');
	};



	exports.validateInSchema = function (attr, options) {
	    var results = [], child, result, key, validate;
	    for (key in this.schema) {
	        // Save a reference to the nested property
	        child = this.children[key];

	        // If validate is implemented
	        if (child && typeof child.validate === 'function') {
	            validate = child.validate;
	            // Call validate on the nested child
	            result = validate.call(child, attr[key], options);
	            // If a result is returned, add it to the return results
	            if (result) {
	                results.push(result);
	            }
	        }
	    }
	    // If there are results, return them.
	    if (results.length) {
	        return results;
	    }
	};

	exports.getChildAttribute = function (attr, children) {

	    var dotIndex, openBracket, dotFirst, bracketFirst, closeBracket, itemIndex, instanceKey, child;
	    dotIndex = attr.indexOf('.');
	    openBracket = attr.indexOf('[');

	    // Check which comes first - dot or bracket?
	    dotFirst = dotIndex !== -1 && (dotIndex < openBracket || openBracket === -1);
	    bracketFirst = openBracket !== -1 && (openBracket < dotIndex || dotIndex === -1);

	    if (dotFirst) {
	        instanceKey = attr.substring(0, dotIndex);
	        child = children[instanceKey].get(attr.substring(dotIndex + 1));
	        return child;
	    }
	    else if (bracketFirst) {
	        closeBracket = attr.indexOf(']', openBracket);
	        itemIndex = attr.substring(openBracket + 1, closeBracket);
	        instanceKey = attr.substring(0, openBracket);

	        if (children.hasOwnProperty(instanceKey)) {
	            child = children[instanceKey];
	            var context = child.at(itemIndex);
	            if (!context) {
	                return;
	            }
	            attr = attr.substring(closeBracket + 1);
	            if (dotIndex === -1) {
	                return context.toJSON();
	            } else {
	                return context.get(attr.substring(attr.indexOf('.') + 1));
	            }
	        }
	        else {
	            return;
	        }
	    }
	};


	exports.getChildContext = function (child, key, values) {

	    var context, closeBracket, itemIndex, propAfterDot, wrapped;

	    if (child instanceof Backbone.Collection) {
	        closeBracket = key.indexOf(']');
	        itemIndex = parseInt(key.substring(1, closeBracket), 10);
	        context = child.at(itemIndex);
	    }

	    if(key.indexOf('.') !== -1) {
	        // Get the property after the dot
	        propAfterDot = key.substring(key.indexOf('.') + 1);

	        // wrap attributes
	        wrapped = {};
	        wrapped[propAfterDot] = values;
	        // Reassign wrapped attributes to values
	        values = wrapped;
	    }

	    return {
	        child: context || child,
	        values: values
	    };
	};



	exports.getChildKey = function (key) {
	    var dotIndex, openBracket, dotFirst, bracketFirst, instanceKey;

	    dotIndex = key.indexOf('.');
	    openBracket = key.indexOf('[');

	    // Check which comes first - dot or bracket?
	    dotFirst = dotIndex !== -1 && (dotIndex < openBracket || openBracket === -1);
	    bracketFirst = openBracket !== -1 && (openBracket < dotIndex || dotIndex === -1);

	    if (dotFirst) {
	        instanceKey = key.substring(0, dotIndex);
	    }
	    else if (bracketFirst) {
	        instanceKey = key.substring(0, openBracket);
	    }
	    else {
	        instanceKey = key
	    }

	    return {
	        key: instanceKey,
	        relativeKey: instanceKey !== key ? key.replace(instanceKey, '') : key
	    };
	};

	exports.getChild = function (key, children) {
	    return children[key];
	};


/***/ }
/******/ ])
});
;