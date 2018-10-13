var config;
var runTimeout = 0;
var stop_running = true;
var population;
var run;
var generation;

function Item(name, weight, cost, bound){
	this.name = name;
	this.weight = weight;
	this.cost = cost;
	this.bound = bound;
}

onmessage = function(event) {
	var message = JSON.parse(event.data);
	switch(message.act){
		case 'pause':
			stop_running = true;
			if(runTimeout) clearTimeout(runTimeout);
			break;
		case 'init':
			config = message.data;
			run = 0;
			runGenetickAlgorithm();
			break;
	}
}

function runGenetickAlgorithm(){
	generation = 0;
	//make initial random population
	population = new Array();
	for(var i = 0;i<config.popSize;){
		var object = new Object();
		object.chromosome = generateChromosome();
		object.fitness = 0;
		if(insertIntoPopulation(object, population)) i++;
	}
	stop_running = false;
	iterGA();
}

function iterGA(){
	//sort population by fitness
	population.sort( function (a,b) { return a.fitness-b.fitness });

	if(generation > 0) {
		var message = new Object();
		message.act = "generation";
		message.data = {}
		message.data.pop = population[population.length-1];
		message.data.items = config.items;
		postMessage(JSON.stringify(message));
	}

	if(stop_running || config.maxGenerations == generation){
		run++;
		var message = new Object();
		message.act = "answer";
		message.data = {}
		message.data.pop = population[population.length-1];
		message.data.items = config.items;
		postMessage(JSON.stringify(message));
		if(!stop_running && run < config.maxRuns){
			runTimeout = setTimeout(runGenetickAlgorithm, 150);
			return true;
		}
		return true;
	}

	for(var i = 0;i<population.length;i++){
		population[i].fitness = measureFitness(population[i].chromosome);
	}

	var newPopulation = new Array();
	for(var i = 0;i<population.length;){
		var rnum = Math.ceil(Math.random() * 3);
		switch(rnum){
			case 1:
				var individual = population[selectChromosomeFromPopulation()];
				//perform reproduction
				var newIndividual = new Object();
				newIndividual.chromosome = individual.chromosome.slice();
				newIndividual.fitness = individual.fitness;
				//insert copy in new pop
				if(insertIntoPopulation(newIndividual,newPopulation))
					i++;
				break;
			case 2:
				var individual1 = population[selectChromosomeFromPopulation()];
				var individual2 = population[selectChromosomeFromPopulation()];
				//perform crossover
				var child1 = new Object();
				var child2 = new Object();
				var xover = Math.floor(Math.random()*individual1.chromosome.length);
				child1.chromosome = individual1.chromosome.slice(0,xover).concat(individual2.chromosome.slice(xover));
				child2.chromosome = individual2.chromosome.slice(0,xover).concat(individual1.chromosome.slice(xover));
				child1.fitness = measureFitness(child1.chromosome);
				child2.fitness = measureFitness(child2.chromosome);

				var candidates = new Array();
				candidates.push(individual1);
				candidates.push(individual2);
				candidates.push(child1);
				candidates.push(child2);

				candidates.sort( function (a,b) { return a.fitness-b.fitness });
				//insert offspring in new pop
				if(insertIntoPopulation(candidates[2],newPopulation))
					i++;
				if(insertIntoPopulation(candidates[3],newPopulation))
					i++;
				break;
			case 3:
				var individual = population[selectChromosomeFromPopulation()];
				//perform mutation
				var mutant = new Object();
				mutant.chromosome = individual.chromosome.slice();
				var r = Math.random();
				var x1 = Math.floor(Math.random()*mutant.chromosome.length);
				var x2 = Math.floor(Math.random()*mutant.chromosome.length);
				if(r < 0.5){
					//Mutate 1 - reciprocal exchange
					var temp = mutant.chromosome[x1];
					mutant.chromosome[x1] = mutant.chromosome[x2];
					mutant.chromosome[x2] = temp;
				}else{
					//Mutate 2 - insertion
					var tempC = mutant.chromosome.splice(x1,1);
					var tempA = mutant.chromosome.splice(x2);
					mutant.chromosome = mutant.chromosome.concat(tempC.concat(tempA));
				}
				mutant.fitness = measureFitness(mutant.chromosome);
				//insert mutant in new pop
				if(insertIntoPopulation(mutant,newPopulation))
					i++;
				break;
			default:
		}
	}
	population = newPopulation;
	generation++;

	if(!stop_running){
		runTimeout = setTimeout(iterGA, 50);
	}
}

function measureFitness(chromosome){
	var fitness = 0;
	for(var i = 0;i<chromosome.length;i++){
		fitness += chromosome[i].value;
	}
	return fitness;
}

function generateChromosome() {
	var randomchromosome = [];
	var weightSum = 0;
	var availableItems = config.items.slice();
	while(weightSum <= config.max_weight && availableItems.length){
		var index = Math.floor(Math.random() * availableItems.length);
		if((weightSum + availableItems[index].weight) <= config.max_weight){
			randomchromosome = randomchromosome.concat(availableItems[index]);
			weightSum += availableItems[index].weight;
			var countArray = randomchromosome.filter(getItemsFilter, availableItems[index]);

			if(countArray.length >= availableItems[index].bound){
				availableItems.splice(index,1);
			}

		}else{
			availableItems.splice(index,1);
		}
	}
	return randomchromosome;
}

function getItemsFilter(item){
	return this === item;
}

function insertIntoPopulation(individual,newPopulation){
	//don't insert into population if child violates max weight rule
	var total_weight = 0;
	for(var i=0;i<individual.chromosome.length;i++){
		total_weight += individual.chromosome[i].weight;
	}
	if(total_weight > config.max_weight)
		return false;
	//don't insert into population if child violates bound rule
	for(var i=0;i<config.items.length;i++){
		var countArray = individual.chromosome.filter(getItemsFilter,config.items[i]);
		if(countArray.length > config.items[i].bound){
			return false;
		}
	}
	newPopulation.push(individual);
	return true;
}

function arrays_equal(array1,array2){
	if(array1.length != array2.length)
		return false;
	for(var i=0;i<array1.length;i++){
		if(array1[i] != array2[i])
			return false;
	}
	return true;
}

function selectChromosomeFromPopulation(){
	switch(config.selection){
		case "tournament":
			var choices = new Array();
			for(var i = 0;i<5;i++){
				var rnum = Math.floor(Math.random() * population.length);
				choices[i] = population[rnum];
				choices[i].index = rnum;
			}
			choices.sort( function (a,b) { return a.fitness-b.fitness });
			var r = Math.random();
			//p = 0.5
			if(r < 0.5){
				//return most fit
				return choices[choices.length-1].index;
			}
			//otherwise, return a random choice
			var rnum = Math.floor(Math.random() * choices.length);
			return choices[rnum].index;
			break;
		case "rank":
			var r = Math.random()*((population.length*(population.length+1))/2);
			var sum = 0;
			for(var i = 0;i<population.length;i++){
				for (sum += i; sum > r; r++) return i;
			}
			return population.length-1;
			break;
		default:
			return 1;
	}
}
