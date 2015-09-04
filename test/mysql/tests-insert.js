var should = require('chai').should();
var expect = require('chai').expect;
var qb = require('../../drivers/mysql/query_builder.js').QueryBuilder();

var test_data = {id:3, name:'Milky Way', type: 'spiral'};
var test_data_set = [{id:3, name:'Milky Way', type: 'spiral'}, {id:4, name: 'Andromeda', type: 'spiral'}];

// table, data, callback, ignore, suffix

describe('insert()', function() {
	it('should exist', function() {
		should.exist(qb.insert);
	});
	it('should be a function', function() {
		qb.insert.should.be.a('function');
	});
	it('should add a table to from_array when a table is supplied', function() {
		qb.reset_query();
		qb.insert('galaxies', test_data);
		qb.from_array.should.eql(['`galaxies`']);
	});
	it('should only accept nothing or a string for the table (first) parameter', function() {
		qb.reset_query();

		// Doing these to prevent other errors
		qb.from('galaxies');

		expect(function() { qb.insert([], test_data); 		}, 'empty array provided').to.throw(Error);
		expect(function() { qb.insert({}, test_data); 		}, 'empty object provided').to.throw(Error);
		expect(function() { qb.insert(3, test_data); 		}, 'integer provided').to.throw(Error);
		expect(function() { qb.insert(3.5, test_data); 		}, 'float provided').to.throw(Error);
		expect(function() { qb.insert(true, test_data); 	}, 'true provided').to.throw(Error);
		expect(function() { qb.insert(Infinity, test_data);	}, 'Infinity provided').to.throw(Error);
		expect(function() { qb.insert([1,2], test_data); 	}, 'array of numbers provided').to.throw(Error);
		expect(function() { qb.insert(/foobar/, test_data);	}, 'regex provided').to.throw(Error);

		expect(function() { qb.insert(NaN, test_data); 		}, 'NaN provided').to.not.throw(Error);
		expect(function() { qb.insert(false, test_data); 	}, 'false provided').to.not.throw(Error);
		expect(function() { qb.insert('', test_data); 		}, 'empty string provided').to.not.throw(Error);
		expect(function() { qb.insert('  ', test_data); 	}, 'string full of spaces provided').to.not.throw(Error);
		expect(function() { qb.insert(null, test_data); 	}, 'null provided').to.not.throw(Error);
		expect(function() { qb.insert(undefined, test_data);},'undefined provided').to.not.throw(Error);
	});
	it('should fail if a number, non-standard object, regex, boolean, array of non-objects, or non-empty string is provided in data parameter', function() {
		qb.reset_query();

		expect(function() { qb.insert('galaxies',test_data);}, 'non-empty array provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',[]); 		}, 'empty array provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',[test_data,test_data]); }, 'array of non-empty standard objects provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{}); 		}, 'empty object provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',''); 		}, 'empty string provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',null); 	}, 'null provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',undefined);}, 'undefined provided').to.not.throw(Error);
		expect(function() { qb.insert('galaxies');			}, 'nothing provided').to.not.throw(Error);

		expect(function() { qb.insert('galaxies',3); 		}, 'integer provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',3.5); 		}, 'float provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',true); 	}, 'true provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',Infinity);	}, 'Infinity provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',[{},{}]); 	}, 'array of empty objects provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',[1,2]); 	}, 'array of numbers provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',['abc',2,{foo:'bar'}]); }, 'array of mixed values provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',/foobar/);	}, 'regex provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',NaN); 		}, 'NaN provided').to.throw(Error);
		expect(function() { qb.insert('galaxies',false); 	}, 'false provided').to.throw(Error);
		expect(function() { qb.insert('galaxies','  '); 	}, 'string full of spaces provided').to.throw(Error);
	});
	it('should allow for an empty data parameter', function() {
		qb.reset_query();
		var sql = qb.insert('galaxies');
		sql.should.eql("INSERT INTO `galaxies` () VALUES ()");
	});
	it('should utilize pre-existing tables set in from_array', function() {
		qb.reset_query();
		qb.from('galaxies');
		var sql = qb.insert();
		sql.should.eql("INSERT INTO `galaxies` () VALUES ()");
	});
	it('should utilize pre-existing values set in in set_array', function() {
		qb.reset_query();
		qb.set(test_data);
		var sql = qb.insert('galaxies');
		sql.should.eql("INSERT INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral')");
	});
	it('should utilize pre-existing tables and values from from_aray and set_array, respectively', function() {
		qb.reset_query();
		qb.from('galaxies').set(test_data);
		var sql = qb.insert();
		sql.should.eql("INSERT INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral')");
	});
	it('should accept a non-empty object for the data parameter', function() {
		qb.reset_query();
		var sql = qb.insert('galaxies', test_data);
		sql.should.eql("INSERT INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral')");
	});
	it('should convert call to insert_batch() if an array of non-emtpy objects is passed in the data parameter', function() {
		qb.reset_query();
		var sql = qb.insert('galaxies', test_data_set);
		var sql_b = qb.insert_batch('galaxies', test_data_set);
		sql.should.eql(sql_b);
	});
	it('should fail if any invalid values are passed in the data object.', function() {
		qb.reset_query();
		var func = function() { console.log("foo"); };
		var regex = /foobar/;
		var arr = [1,2,3];
		var obj = {foo: 'bar'};

		expect(function() { qb.insert('galaxies',{id: 1}); 			}, 'number in data').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{id: 'foo'}); 		}, 'string in data').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{id: false}); 		}, 'boolean in data').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{id: null}); 		}, 'null in data').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{id: undefined});	}, 'undefined in data').to.not.throw(Error);
		expect(function() { qb.insert('galaxies',{id: func}); 		}, 'function in data').to.throw(Error);
		expect(function() { qb.insert('galaxies',{id: regex}); 		}, 'regex in data').to.throw(Error);
		expect(function() { qb.insert('galaxies',{id: Infinity});	}, 'Infinity in data').to.throw(Error);
		expect(function() { qb.insert('galaxies',{id: NaN});		}, 'NaN in data').to.throw(Error);
		expect(function() { qb.insert('galaxies',{id: arr});		}, 'array in data').to.throw(Error);
		expect(function() { qb.insert('galaxies',{id: obj});		}, 'object in data').to.throw(Error);

	});
});

describe('insert_ignore()', function() {
	it('should exist', function() {
		should.exist(qb.insert_ignore);
	});
	it('should be a function', function() {
		qb.insert_ignore.should.be.a('function');
	});
	it('should create an INSERT IGNORE statement', function() {
		qb.reset_query();
		var sql = qb.insert_ignore('galaxies', test_data);
		sql.should.eql("INSERT IGNORE INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral')");
	});
	it('should be just a wrapper of insert() that passes true to the 3rd parameter', function() {
		qb.reset_query();
		var sql = qb.insert_ignore('galaxies', test_data);
		var sql_b = qb.insert('galaxies', test_data, true);
		sql.should.eql(sql_b);
	});
	it('should convert to insert_batch() if an array of data is supplied to second parameter', function() {
		qb.reset_query();
		var sql = qb.insert_ignore('galaxies', test_data_set);
		sql.should.eql("INSERT IGNORE INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral'), (4, 'Andromeda', 'spiral')");
	});
	it('should support the "on_dupe" suffix parameter... effectively appending to the query anything supplied in this parameter', function() {
		qb.reset_query();
		var sql = qb.insert_ignore('galaxies', test_data, 'ON DUPLICATE KEY UPDATE last_update = NOW()');
		sql.should.eql("INSERT IGNORE INTO `galaxies` (`id`, `name`, `type`) VALUES (3, 'Milky Way', 'spiral') ON DUPLICATE KEY UPDATE last_update = NOW()");
	});
});
