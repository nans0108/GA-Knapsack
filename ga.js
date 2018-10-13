function Item(name, weight, value, bound) {
	this.name = name;
	this.weight = weight;
	this.value = value;
	this.bound = bound;
}

var config = new Object();
config.popSize = 800;
config.maxGenerations = 200;
config.maxRuns = 1;
config.mutateProb = 0.05;
config.selection = "rank";
var worker;

function init() {
	worker = new Worker("ga-worker.js");
}

function knapsack_init() {
	stop();
	if(isNaN(parseInt($('#max_weight').val()))){
		$('#max_weight').val('15');
	}
	config.max_weight = parseInt($('#max_weight').val());
	if(isNaN(parseInt($('#bound').val()))){
		$('#bound').val('1');
	}
	config.bound = parseInt($('#bound').val());
	config.selection = $('#selection').val();

	config.items = [];
	$('#items_list tr').each(function(index,value){
		val = $(value);
		var item = new Item(
			val.children().children('.name').val(),
			parseInt(val.children().children('.weight').val()),
			parseInt(val.children().children('.value').val()),
			parseInt(val.children().children('.bound').val())
		);
		config.items.push(item);
	});
	$('#result').empty();
	worker.onmessage = function(event) {
		handleMessage(event.data);
	};
	var message = new Object();
	message.act = "init";
	message.data = config;
	worker.postMessage(JSON.stringify(message));
}


function handleMessage(data) {
	var resultObj = JSON.parse(data);
	if(resultObj.act == "debug"){
		console.log(resultObj.data);
		return false;
	}
	if(resultObj.act == "answer"){
		$('#status').html("Done: Fitness: "+resultObj.data.pop.fitness+"<br>");
		draw(resultObj.data);
		return true;
	}

	if(resultObj.act == "generation"){
		$('#status').html("Fitness: "+resultObj.data.pop.fitness+"<br>");
		draw(resultObj.data);
		return true;
	}
}

function draw(result) {
	var resultWeight = 0;
	var resultString = "<table><thead><tr><td>Count</td><td>Name</td><td>Weight</td><td>Value</td></tr></thead><tbody>";

	for(var i = 0;i<result.items.length;i++){
		var countArray = result.pop.chromosome.filter(getItemsFilter,result.items[i]);
		resultString += "<tr><td>"+countArray.length+"</td><td>"+result.items[i].name+"</td><td>"+result.items[i].weight+"</td><td>"+result.items[i].value+"</td></tr>";
	}
	for(var i = 0;i<result.pop.chromosome.length;i++){
		resultWeight+=result.pop.chromosome[i].weight;
	}
	resultString+="</tbody></table><p> Total Value: "+result.pop.fitness+", Total Weight: "+resultWeight+"</p>"
	$('#result').html(resultString);
}

function getItemsFilter(item) {
	return this.name === item.name;
}
