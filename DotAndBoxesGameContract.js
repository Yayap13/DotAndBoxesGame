"use strict";
var DotsAndBoxesGameContract = function() {
	// Data stored by the smart contract
	LocalContractStorage.defineProperty(this, "game_id")
	LocalContractStorage.defineMapProperty(this, "tx_hash_to_game")

	LocalContractStorage.defineProperty(this, "games")
	LocalContractStorage.defineProperty(this, "stats")
}

DotsAndBoxesGameContract.prototype = {
	// init is called once, when the contract is deployed.
	init: function() {
		this.game_id = 1;
		var currentStats = {};
		currentStats["uniquePlayers"] = {};
		currentStats["totalGames"] = 0;
		currentStats["gamesInProgress"] = 0;
		currentStats["totalBarPlaced"] = 0;
		this.stats = currentStats;
		this.games = {};
	},

	createNewGame: function(size, name, allowMatchmaking) {
		size = parseInt(size);
		if(size < 3 || size > 7) {
			throw new Error("Game size is too small or too large");
		}
		if(Object.prototype.toString.call(name) !== "[object String]" || name.length<=0 || name.length>20) {
			throw new Error("Your pseudo is not valid or too long");
		}
		if(!typeof(true) === "boolean") {
			allowMatchmaking = true;
		}
		if(allowMatchmaking) {
			var currentGames = this.games;
			var details = {};
			details["size"] = size;
			details["creator"] = name;
			details["waitingForPlayers"] = true;
			details["creationTime"] = Date.now();
			currentGames[Blockchain.transaction.hash] = details;
			this.games = currentGames;
		}

		var board = {};
		board["size"] = size;
		board["allowMatchmaking"] = allowMatchmaking;
		board["squares"] = new Array(size*size).fill(null);
		board["bar"] = new Array((size*(size+1))*2).fill(null);
		board["players"] = [Blockchain.transaction.from, null];
		board["playerNames"] = [name, null];
		board["playerTurn"] = Math.floor(Math.random() * 2);
		board["state"] = "Waiting for opponent";
		board["winner"] = null;
		board["gameId"] = this.game_id;
		this.game_id += 1;
		var currentStats = this.stats;
		currentStats.totalGames = currentStats.totalGames+1;
		currentStats.gamesInProgress = currentStats.gamesInProgress+1;
		currentStats.uniquePlayers[Blockchain.transaction.from] = Date.now();
		this.stats = currentStats;
		this.tx_hash_to_game.put(Blockchain.transaction.hash, board);
	},

	joinGame: function(txHash, name) {
		var board = this.tx_hash_to_game.get(txHash);
		if(board == null) {
			throw new Error("That game does not exist")
		}
		if(board.players[1]!=null) {
			throw new Error("That game has already two players")
		}
		if(board.players[0]==Blockchain.transaction.from) {
			throw new Error("You cannot play against yourself")
		}
		if(Object.prototype.toString.call(name) !== "[object String]" || name.length<=0 || name.length>20) {
			throw new Error("Your pseudo is not valid or too long");
		}
		if(board.allowMatchmaking) {
			var currentGames = this.games;
			currentGames[txHash].waitingForPlayers = false;
			this.games = currentGames;
		}
		board.players[1] = Blockchain.transaction.from;
		board.playerNames[1] = name;
		board.state = "In progress";
		var currentStats = this.stats;
		currentStats.uniquePlayers[Blockchain.transaction.from] = Date.now();
		this.stats = currentStats;
		this.tx_hash_to_game.put(txHash, board);
	},

	play: function(txHash, move) {
		var board = this.tx_hash_to_game.get(txHash);
		if(board == null) {
			throw new Error("That game does not exist")
		}
		if(board.players[1]==null) {
			throw new Error("Please, wait for someone to join before playing.")
		}
		if(isNaN(move) || move<0 || move>board.bar.length-1 || board.bar[move]!=null) {
			throw new Error("This action is not possible")
		}
		if(board.players[board.playerTurn]!=Blockchain.transaction.from) {
			throw new Error("That's not your turn")
		}

		board.bar[move] = board.playerTurn;

		// Check if player has closed a square
		var closedSquares = false;
		for(var i=0; i<board.squares.length; i++) {
			if(board.squares[i] != null) {
				continue;
			}
			var topBarIndex = (parseInt(i/board.size)*(board.size+board.size+1))+(i%board.size);
			var leftBarIndex = topBarIndex+board.size;
			var rightBarIndex = leftBarIndex+1;
			var bottomBarIndex = rightBarIndex+board.size;
			if(board.bar[topBarIndex] != null && board.bar[leftBarIndex] != null && board.bar[rightBarIndex] != null && board.bar[bottomBarIndex] != null) {
				board.squares[i] = board.playerTurn;
				closedSquares = true;
			}
		}
		if(!closedSquares) {
			board.playerTurn = (board.playerTurn+1)%2;
		}

		// Check if game is over
		var gameOver = true;
		for(var i=0; i<board.squares.length; i++) {
			if(board.squares[i]==null) {
				gameOver = false;
			}
		}
		if(gameOver) {
			board.state = "Finished"
			var currentStats = this.stats;
			currentStats.gamesInProgress = currentStats.gamesInProgress-1;
			this.stats = currentStats;

			var player1Points = 0;
			var player2Points = 0;
			for(var i=0; i<board.squares.length; i++) {
				if(board.squares[i]==0) {
					player1Points += 1;
				} else {
					player2Points += 2;
				}
			}
			if(player1Points>player2Points) {
				board.winner = 0;
			} else if(player2Points>player1Points) {
				board.winner = 1;
			} else {
				board.winner = -1;
			}
			if(board.allowMatchmaking) {
				var currentGames = this.games;
				delete currentGames[txHash];
				this.games = currentGames;
			}
		}
		var currentStats = this.stats;
		currentStats.totalBarPlaced = currentStats.totalBarPlaced+1;
		this.stats = currentStats;
		this.tx_hash_to_game.put(txHash, board);
	},

	getGameInfo: function(txHash) {
		var board = this.tx_hash_to_game.get(txHash);
		if(board == null) {
			throw new Error("That game does not exist")
		}
		board["whoCalled"] = Blockchain.transaction.from;
		return board
	},

	getListOfGames: function() {
		var games = this.games;
		games["whoCalled"] = Blockchain.transaction.from;
		return games
	},

	getStats: function() {
		return this.stats
	},
}

module.exports = DotsAndBoxesGameContract