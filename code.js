"use strict";
$(document).ready(function(){
	
	// Width & height: number of rows and columns of the grid
	var width, height;
	
	// blockList: list containing Block objects representing relevant data
	// mineList: list containing Block objects that are mines
	var blockList, mineList;
	
	// lost, running: booleans indicating whether the game has been lost or is running
	// totalMines: number of mines (whether flagged or unflagged)
	var lost, running, totalMines, totalFlagged, uncoveredBlocks;
	
	// Timing information
	var currentTime, startDate, timerID;

	$('#grid').contextmenu(event => event.preventDefault());

	loadDifficulty();
	initializeGame();

	// Perform upon new game or loading site
	function initializeGame(){
		displayGame();
		getGameSettings();
		initializeGameInfo();
		createGrid();
		loadGame();
	}

	// show game, hide settings and back navigation button, show settings button
	function displayGame(){
		$('#game').show();
		$('#settingsnav').show();
		$('#newgame').show();
		$('#settings').hide();
		$('#backnav').hide();
		$('#time').removeClass('newbest');
		$('#bestscore').removeClass('newbest');
	}

	// Upon starting a new game, obtain user settings and save them to LocalStorage.
	function getGameSettings(){
		width = getWidthInput();
		height = getHeightInput();
		totalMines = getMineInput();
		saveDifficulty();
	}

	// Upon creation of a new game, reset all stats.
	function initializeGameInfo(){
		lost = false;
		running = false;
		blockList = [], mineList = [];
		uncoveredBlocks = 0;
		
		clearInterval(timerID);
		setTime(0);
		displayBest();
		setTotalFlagged(0);
	}

	// Create a grid of uncovered, untouched blocks depending on height and width.
	function createGrid() {
		
		// Clear rows & blocks inside the grid
		grid.innerHTML = '';
		
		// Remove these classes in case the previous game had been won or lost
		$('#grid').removeClass("won lost");
		running = true;

		// For height rows and width columns: create a block object, create an HTML block,
		// and give the block object a reference to its HTML block.
		for (let i = 0; i < height; i++) {
			let row = document.createElement('div');
			row.classList.add('row');
			$('#grid').append(row);
			for (let j = 0; j < width; j++) {
					let block = document.createElement("div");
					block.classList.add('block');
					row.append(block);
					blockList.push(new Block(i, j, block));
			}
		}

		
		
		$('.block').click(function(e) {
			let row = $(this).parent().index();
			let column = $(this).index();
			let block = getBlock(row, column);
			
			// Left-clicking uncovers the block.
			if (!e.shiftKey){
				block.click(false);
				
			// Shift-clicking flags the block.
			} else {
				block.rightClick(false);
			}
		});

		// Right-clicking flags the block.
		$('.block').contextmenu(function() {
			let row = $(this).parent().index();
			let column = $(this).index();
			getBlock(row, column).rightClick(false);
		});
	}

	function loadGame(){
		
		// If there was no previously loaded game, we do nothing.
		if (!localStorage.savedClicks) {
			return;
		}
		
		// Otherwise, load the mine locations, clicks, and relevant time information.
		loadMines();
		loadClicks();
		resumeTimer();
	}

	//  Load the alread-generated list of mines from the previously saved game.
	function loadMines(){
		let loadedMines = localStorage.savedMines;
		for (let n = 0; n < loadedMines.length; n+= 2){
			
			// Each mine location is represented its (1) row and (2) column, each encoded as a character
			let i = loadedMines[n].charCodeAt();
			let j = loadedMines[n + 1].charCodeAt();
			let block = getBlock(i, j);
			block.setMine();
			mineList.push(block);
		}
	}

	//  Load and replay the sequence of clicks from the previous game to recreate the minefield.
	function loadClicks(){
		let loadedClicks = localStorage.savedClicks;
		
		// Each click is recorded by the (1) block row, (2) column row, and (3) whether it was a left- or right- click.
		// Each piece of information is encoded as a character.
		for (let n = 0; n < loadedClicks.length; n+= 3){
			let i = loadedClicks[n].charCodeAt();
			let j = loadedClicks[n + 1].charCodeAt();
			let type = loadedClicks[n + 2].charCodeAt();	
			let block = getBlock(i, j);
			if(type == 0){
				block.click(true);
			} else if (type == 1) {
				block.rightClick(true);
			}
			
			// Determine whether game has been won or lost
			evaluateGame();
		}
	}

	// Updates the time.
	function setTime(newTime){
		currentTime = parseInt(newTime);
		$('#time').html(getTimeDisplay(currentTime));
	}

	// Get the current high score for the particular combination of difficulties.
	// If any setting is custom, there is no high score.
	// Otherwise, if there is no recorded score, set that score to infinity (for easy comparison).
	function getBest(){
		let minetype = localStorage['mines:'];
		let heighttype = localStorage['height:'];
		let widthtype = localStorage['width:'];
		let key = minetype + heighttype + widthtype;
		if ((minetype == 'custom') || (heighttype == 'custom') || (widthtype == 'custom')){
			// Only record high scores for non-custom game modes
			return 'custom';
		} else if (!localStorage[key]){
			// Initialize an unrecorded high score to be infinity
			return (1 / 0);
		} else {
			return localStorage[key];
		}
	}

	// Upon winning a game, determine whether the time is the best for that particular combination of difficulties.
	// If so, update the best score.
	function checkBest(){
		let curBest = getBest();
		if (curBest == 'custom') {
			return;
		}
		if (currentTime < curBest){
			newBest(currentTime);
		} 
	}

	// Executes when a game is won with a new best time for that particular combination of difficulties.
	function newBest(time){
			let minetype = localStorage['mines:'];
			let heighttype = localStorage['height:'];
			let widthtype = localStorage['width:'];
			let key = minetype + heighttype + widthtype;
			localStorage[key] = time;
			$('#bestscore').addClass('newbest');
			$('#time').addClass('newbest');
			displayBest();
	}

	// Executes when a new best time is recorded.
	function displayBest(){
		let curBest = getBest();
		$('#bestscore').html(getTimeDisplay(curBest));
}

	// Initialize a block and associate it with its corresponding HTML elements
	function Block(row, column, block) {
		this.row = row;			// Coordinates
		this.column = column;
		
		this.element = block;		// Reference to the HTML element
		
		this.adjacentMines = 0;		// Initialize values
		this.adjacentFlags = 0;
		this.mine = false;
		this.uncovered = false;
		this.flagged = false;

		// Executes upon left-click (or loading a left-click)
		this.click = function(loaded){
			
			// Ignore clicks if the game has stopped or if the block has been flagged
			if (!running || this.flagged){
				return;
			}
			this.uncover();
			
			// Check if the game has been won or lost
			evaluateGame();
			
			// Loaded: indicates whether this is a loaded click or a new click. We don't want to re-record 
			// clicks while we load them!
			if (!loaded){
				saveClick(this.row, this.column, 0);
			}
		};

		// Executes upon right/shift-click, (or loaded right/shift-click)
		this.rightClick = function(loaded){
			
			// Ignore right-clicks after the game has been won or lost
			if (!running){
				return;
			}
			this.flag();
			
			// Again, we don't want to re-record clicks while we're loading them
			if (!loaded){
				saveClick(this.row, this.column, 1);
			}
		};

		//  For the mine that causes the loss (do this when we click on a mine)
		this.revealResponsibleMine = function(){	
			$(this.element).html('!');
			$(this.element).addClass('mine');
			this.uncovered = true;
			lost = true;
		};

		//  For a non-responsible revealed mine (whether marked or not)
		this.revealMine = function(){	
			if (!this.uncovered){
				$(this.element).addClass('mine');
				$(this.element).html(':(');
				lost = true;				
			}
		};

		//  Reveals a non-mine (adjacent to a mine or not)
		this.revealSafe = function(){
			this.uncovered = true;
			uncoveredBlocks++;
			if (this.adjacentMines == 0){
				this.revealNotAdjacent();
			} else {
				this.revealAdjacent();
			}
		};

		//  Reveals a non-mine adjacent to a mine
		this.revealAdjacent = function(){
			$(this.element).addClass('adjacent');
			$(this.element).html(this.adjacentMines);
		};

		//  Reveals a non-mine not adjacent to a mine
		this.revealNotAdjacent = function(){
			$(this.element).addClass('uncovered');
			$(this.element).html('');
			let adj = this.getAdj(false, true);
			for (let i = 0; i < adj.length; i++){
				adj[i].uncover();
			}
		}

		//  Executes upon first click of a game
		this.firstClick = function(){
			createMines(row, column);
			startTimer();		
		};

		//  Executes if a block is uncovered and if that block's adjacent mines equals
		//  the number of adjacent flags
		this.uncoverUnflagged = function(){
			let adj = this.getAdj(false, false);
			for (let i = 0; i < adj.length; i++){
				adj[i].uncover();
			}
		};

		// Executes any time a block is uncovered (whether by directly clicking or not)
		this.uncover = function() {
			if (!localStorage.savedMines) {
				this.firstClick();			//  Don't recreate loaded minefield
			}
			if (this.mine) {
				this.revealResponsibleMine();
			} else if (!this.uncovered){
				this.revealSafe();
			} else if (this.adjacentMines == this.adjacentFlags){
				this.uncoverUnflagged();
			}
		};

		// Executes when the (covered) block is designated a mine, during the creation or loading of the minefield
		this.setMine = function() {
			this.mine = true;
			let adj = this.getAdj();
			for(let n = 0; n < adj.length; n++){
				let block = adj[n];
				block.adjacentMines++;
			}
		};

		// Executes upon left-click or shift-click
		this.flag = function() {
			if (!running || uncoveredBlocks == 0){ return; }
			if (!this.uncovered){
				if (!this.flagged) {
					this.setToFlag();
				} else {
					this.setToUnflagged();
				}
			}
		};

		// Sets to flag and alerts adjacent blocks
		this.setToFlag = function(){
			if (totalFlagged < totalMines){
				this.flagged = true;
				$(this.element).addClass('flagged');
				$(this.element).html('!');

				setTotalFlagged(totalFlagged + 1);
				let adj = this.getAdj(true, true);
				for (let i = 0; i < adj.length; i++){
					adj[i].adjacentFlags++;
				}
			}
		}

		// Removes flag and alerts adjacent blocks
		this.setToUnflagged = function(){
			this.flagged = false;
			$(this.element).removeClass('flagged');
			$(this.element).html('');

			setTotalFlagged(totalFlagged - 1);
			let adj = this.getAdj(true, true);
			for (let i = 0; i < adj.length; i++){
				adj[i].adjacentFlags--;
			}
		}

		// Use boolean parameters to indicate whether to included covered or flagged blocks
		// If covered == true, we include covered blocks. If false, we only include uncovered blocks.
		// If flagged == true, we include flagged blocks. If false we only include unflagged blocks.
		this.getAdj = function(covered = true, flagged = true) {
			let adj = [];
			let top = Math.max(this.row - 1, 0);
			let left = Math.max(this.column - 1, 0);
			let bottom = Math.min(this.row + 1, height - 1);
			let right = Math.min(this.column + 1, width - 1);
			for (let i = top; i <= bottom; i++){
				for (let j = left; j <= right; j++){
					let block = getBlock(i,j);
					if (!((this.row == i) && (this.column == j)) 
						&& (!block.uncovered || covered)
						&& (!block.flagged || flagged)) {
						adj.push(block);
					}
				}
			}
			return adj;
		};
	}

	// Creates mines randomly upon first click. Creates a bubble around the first-clicked block.
	function createMines(row, column) {
		localStorage.savedMines = '';
		let free = [];
		
		// Bubble: guarantees that the user won't click on a block adjacent to a mine
		let bubble = ((height * width - totalMines) >= 9);	// 1 if we have enough space for a bubble; 0 if not
		
		// Free:  the list of available spaces which we'll choose from to select mines
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				if((Math.abs(i - row) > bubble) || (Math.abs(j - column) > bubble)) {
					free.push(getBlock(i, j));
				}
			}
		}
		
		// Select (n = totalMines) mines
		for(let n = 0; n < totalMines; n++) {
			let rand = Math.floor(Math.random() * free.length);
			let block = free[rand];
			free.splice(rand, 1);
			block.setMine();
			mineList.push(block);
			saveMine(block.row, block.column);
		}
	}

	// Updates the number of flags. 
	function setTotalFlagged(newFlagged){
		totalFlagged = newFlagged;
		$('#minesleft').html(totalMines - totalFlagged);
	}

	// Saves a mine location (row, column) to localStorage when that mine is created.
	// Integers are ASCII-encoded.
	function saveMine(i, j){
		localStorage.savedMines += String.fromCharCode(i);
		localStorage.savedMines += String.fromCharCode(j);
	}

	// Saves a click location (row, column) and type (0 = uncover, 1 = flag) to localStorage
	// Integers are ASCII-encoded.
	function saveClick(i, j, type){
		if (!localStorage.savedClicks){
			localStorage.savedClicks = '';
		}
		localStorage.savedClicks += String.fromCharCode(i);
		localStorage.savedClicks += String.fromCharCode(j);
		localStorage.savedClicks += String.fromCharCode(type);
	}

	// Returns a block given coordinates
	function getBlock(i, j) {
		return blockList[i * width + j];
	}

	// Evaluate whether the game has been won or lost
	function evaluateGame(){
		if (lost){
			lose();
		} else if (uncoveredBlocks == width * height - totalMines){
			win();
		}
	}

	// Perform upon lost game: Disable input, end timer, store time in memory, change display
	function lose(){
		running = false;			// Disables input and timer
		if (!localStorage.endTime){
			localStorage.endTime = currentTime;
		} else {
			setTime(localStorage.endTime);
		}
		for (let i = 0; i < mineList.length; i++){
			mineList[i].revealMine();
		}
		$('#grid').addClass('lost');
	}

	// Perform upon won game: Disable input, end timer, store time in memory,
	//  change display, update best score
	function win(){
		running = false;		// Disables input and timer
		if (!localStorage.endTime){
			localStorage.endTime = currentTime;
			checkBest();
		} else {
			setTime(localStorage.endTime);
		}
		$('#grid').addClass('won');
		$('#minesleft').html('0');
	}

	// Start timer upon first click.
	function startTimer(){
		startDate = new Date().getTime();
		localStorage.startDate = startDate;
		var timerID = setInterval(updateTime, 100);
	}

	// If an end time was recorded, then don't start.
	// If a previous start date was recorded, then continue the timer.
	function resumeTimer(){
		if (localStorage.endTime){
			setTime(localStorage.endTime);
		} else {
			startDate = localStorage.startDate;
			var timerID = setInterval(updateTime, 100);			
		}

	}

	function updateTime() {
		if (running && localStorage.savedMines) {
			let now = new Date();
			setTime(now.getTime() - startDate);
		}
	};

	// Take a date (in the form of milliseconds) and convert it into a human-readable 
	// timer display in String form
	function getTimeDisplay(ms) {
		
		// For any setting, the previous best time is initialized to infinity (until a new best time is recorded)
		
		if (!isFinite(ms)){
			return 'none';
		}
		
		let h2 = Math.floor(ms / (100 * 10 * 10 * 6 * 10 * 6 * 10));
		ms %= (100 * 10 * 10 * 6 * 10 * 6 * 10);				// Hour tens-place
		if (h2 > 9) { h2 = 9; }									// (10 hours per 10-hour)

		let h1 = Math.floor(ms / (100 * 10 * 10 * 6 * 10 * 6));	// Hour ones-place
		ms %= (100 * 10 * 10 * 6 * 10 * 6);						// (6 10-minutes per hour)

		let m2 = Math.floor(ms / (100 * 10 * 10 * 6 * 10));	// Minute tens-place
		ms %= (100 * 10 * 10 * 6 * 10);						// (10 minutes per 10-minute)

		let m1 = Math.floor(ms / (100 * 10 * 10 * 6));	// Minute ones-place
		ms %= (100 * 10 * 10 * 6);						// (6 10-seconds per minute)

		let s2 = Math.floor(ms / (100 * 10 * 10));		// Second tens-place
		ms %= (100 * 10 * 10);							// (10 seconds per 10-second)

		let s1 = Math.floor(ms / (100 * 10));		// Second ones-place
		ms %= (100 * 10);							// (10 desiseconds per second)

		let d = Math.floor(ms / 100);		// Decisecond place (100 milliseconds per deciseconds)

		return (h2 + '' + h1 + ':' + m2 + '' + m1 + ':' + s2 + '' + s1 + '.' + d);
	}

	// Upon clicking newgame: display game, clear saved game, start new game
	$('#newgame').click(function() {
		clearSavedGame();
		initializeGame();
	});

	// Clear info from saved game
	function clearSavedGame(){
		localStorage.removeItem('savedMines');
		localStorage.removeItem('savedClicks');
		localStorage.removeItem('endTime');
		localStorage.removeItem('startDate');
	}

	// Settings navigation -> Display settings menu
	$('#settingsnav').click(function() {
		$('#settings').show();
		$('#backnav').show();
		$('#settingsnav').hide();
		$('#game').hide();
	});

	// Upon clicking back button, forget settings & display gamme
	$('#backnav').click(function() {
		loadDifficulty();
		displayGame();
	});

	// Upon clicking a setting button (e.g. easy, medium, hard), select the setting
	$('.settingsbutton').click(function() {
		select($(this));
	});

	// Update CSS of selected option
	function showSelected(button){
		$(button).siblings().each(function (){
			$(this).removeClass('selected');
		})
		$(button).addClass('selected');
	}

	// Upon selection of option: update CSS and update information
	function select(button){
		showSelected(button);

		var difficultyMap = {
			"beginner": 0,
			"tiny": 0,
			"easy": 0.25,
			"small": 0.25,
			"medium": 0.5,
			"hard": 0.75,
			"large": 0.75,
			"extreme": 1
		}
		let selection = $(button).text();					// Text of selected button, e.g. "easy" or "extreme"
		let ratio = parseFloat(difficultyMap[selection]);		// Maps option names to ratios
		let thisSlider = $(button).siblings('.slider').children()[0];	// Slider for relevant option
		let type = $(button).siblings('h3').text();						// Type stored in sibling h3 text

		if (type == 'mines:'){
			ratio = 0.07 + (0.16 * ratio);					// Adjusts difficulty for number of mines
		}

		$(thisSlider).val(ratio * 2000).change();			// Update value of relevant slider
		updateValues();
	}

	// Change displayed numbers to the value stored in the slider
	function updateValues(){
		$('#widthinput').siblings('p').html(getWidthInput());
		$('#heightinput').siblings('p').html(getHeightInput());
		$('#mineinput').siblings('p').html(getMineInput());
	}

	// If the user changes a value via slider, deselect all options
	$(document).on('input', 'input', function() {
		$(this).parent().siblings().each(function (){
			$(this).removeClass('selected');
		});
		updateValues();
	});

	// Obtain width input from slider
	function getWidthInput(){
		return 8 + parseInt(($('#widthinput').val() / 2000) * (40 - 8));
	}

	// Obtain height input from slider
	function getHeightInput(){
		return 8 + parseInt(($('#heightinput').val() / 2000) * (30 - 8));
	}

	// Obtain mine input from slider
	function getMineInput(){
		return 1 + parseInt(($('#mineinput').val() / 2000) * (getWidthInput() * getHeightInput() - 1));
	}

	// Obtain user-selected difficulty settings and save them to localStorage
	function saveDifficulty(){
		localStorage['mineval'] = $('#mineinput').val();
		localStorage['widthval'] = $('#widthinput').val();
		localStorage['heightval'] = $('#heightinput').val();

		// initialize each each setting to 'custom'
		localStorage['mines:'] = 'custom';
		localStorage['width:'] = 'custom';
		localStorage['height:'] = 'custom';

		// for each selected button, change setting to that selection
		$('.selected').each(function() {
			let type = $(this).siblings('h3').text();
			let selection = $(this).text();
			localStorage[type] = selection;
		});
	}

	// Retrieve difficulty settings from localStorage and update the settings accordingly
	function loadDifficulty(){
		var mineMap = {
			"beginner": 0,
			"easy": 1,
			"medium": 2,
			"hard": 3,
			"extreme": 4,
			"custom": 5
		}

		var sizeMap = {
			"tiny": 0,
			"small": 1,
			"medium": 2,
			"large": 3,
			"extreme": 4,
			"custom": 5
		}

		if (localStorage['mines:'] == null){	// initialize mines to medium
			localStorage['mines:'] = 'medium';
		}
		if (localStorage['mines:'] != 'custom'){
			select($('#minelist').children()[1 + mineMap[localStorage['mines:']]]);
		} else {
			$('#mineinput').val(localStorage['mineval']).change();
		}

		if (localStorage['width:'] == null){	// initialize width to medium
			localStorage['width:'] = 'medium';
		}
		if (localStorage['width:'] != 'custom'){
			select($('#widthlist').children()[1 + sizeMap[localStorage['width:']]]);
		} else {
			$('#widthinput').val(localStorage['widthval']).change();
		}

		if (localStorage['height:'] == null){	// initialize height to medium
			localStorage['height:'] = 'medium';
		}
		if (localStorage['height:'] != 'custom'){
			select($('#heightlist').children()[1 + sizeMap[localStorage['height:']]]);
		} else {
			$('#heightinput').val(localStorage['heightval']).change();
		}
	}
});

	
