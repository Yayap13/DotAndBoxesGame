"use strict";

var NebPay = require("nebpay");
var nebPay = new NebPay();
//var callbackUrl = "https://pay.nebulas.io/api/mainnet/pay";
var callbackUrl = "https://pay.nebulas.io/api/pay";
var serialNumber; //transaction serial number
var intervalQuery; //periodically query tx results


// Global variables used by our Dapp
var contract_address = "n1z3psWuLTQFFnBFdwKgMaMrMVLCNHXH6T1";
var txHash = "lul";
var firstLoad = true;
var lastBoard = null;
var waitingForResult = false;


function waitForResult() {
	waitingForResult = true;
	$(".waitForResults").show();
}

function onCreateGame() {
	$("#createGameBtn").prop('disabled', true);
	var size = ($("#playerCount").val()*4/100)+3;
	var pseudo = $("#pseudo").val();
	pseudo = (pseudo == "") ? "Anonymous" : pseudo;
	var allowMatchmaking = $("#allowMatchmaking").is(":checked");
	console.log("size: ", size);
	console.log("pseudo: ", pseudo);
	console.log("allowMatchmaking: ", allowMatchmaking);

	$(".waitForResults").show();

	//Send transaction (here is smart contract call)
	serialNumber = nebPay.call(contract_address, 0, "createNewGame", JSON.stringify([size, pseudo, allowMatchmaking]), {
		listener: onCreateNewGame
	});

	function onCreateNewGame(resp) {
		if(typeof(resp)==='string' && resp.startsWith("Error")) {
			throw new Error(resp);
		}
		txHash = resp.txhash;
		intervalQuery = setInterval(function() {
			nebPay.simulateCall(contract_address, 0, "getGameInfo", JSON.stringify([txHash]), {
				qrcode: {
					showQRCode: false
				},
				callback:  callbackUrl,
				listener: onGameReady  //set listener for extension transaction result
			});
		}, 3000);
	}
}

function onGameReady(resp) {
	if(typeof(resp.result)==='string' && !resp.result.startsWith("Error")) {
		console.log("You game is ready, redirection!");
		clearInterval(intervalQuery);
		window.location = location.protocol + '//' + location.host + location.pathname.replace("create.html", "") + 'game.html?id=' + txHash;
	}
}

function onBarClick(elem) {
	//console.log($(elem));
	if(!$(elem).hasClass("selected") && canPlay()) {
		$(elem).addClass("flash");
		var to = contract_address;   //the smart contract address of your Dapp
		var value = "";
		var callFunction = "play" //the function name to be called
		var callArgs =  JSON.stringify([txHash, parseInt($(elem).attr("number"))])  //the parameter, it's format JSON string of parameter arrays, such as'["arg"]','["arg1","arg2]'        
		var options = {
			callback: callbackUrl
		}

		//Send transaction (here is smart contract call)
		serialNumber = nebPay.call(to, value, callFunction, callArgs, options);
		waitForResult();
	}
}

function onJoinGame() {
	$(".join").attr("disabled", true);
	var pseudo = prompt("Please enter your name", "Anonymous");
	if(pseudo=="")
		pseudo = "Anonymous";

	var to = contract_address;   //the smart contract address of your Dapp
	var value = "";
	var callFunction = "joinGame" //the function name to be called
	var callArgs =  JSON.stringify([txHash, pseudo])  //the parameter, it's format JSON string of parameter arrays, such as'["arg"]','["arg1","arg2]'        
	var options = {
		callback:  callbackUrl
	}

	//Send transaction (here is smart contract call)
	serialNumber = nebPay.call(to, value, callFunction, callArgs, options);
	waitForResult();
}


// Get game data
function refreshData() {
	var to = contract_address;
	var value = "";
	var callFunction = "getGameInfo";
	var callArgs = JSON.stringify([txHash]);
	nebPay.simulateCall(to, value, callFunction, callArgs, {
		qrcode: {
			showQRCode: false
		},
		callback:  callbackUrl,
		listener: onGameData  //set listener for extension transaction result
	});
}

function onGameData(resp) {
	$(".loading").hide();
	$(".hideBeforeLoad").show();
	$(".linkToGame").hide();
	$(".joinButton").hide();
	var board = JSON.parse(resp.result);

	if(waitingForResult && JSON.stringify(lastBoard)!=JSON.stringify(board)) { // New Results!
		waitingForResult = false;
		$(".waitForResults").hide();
		$(".bar").removeClass("flash");
	}

	lastBoard = board;
	console.log(board);
	if(firstLoad) {
		createTable(board.size);
		firstLoad = false;
	}
	$("#gameStatus").text(board.state);
	$("#playerOne").text(board.playerNames[0]);
	$("#playerTwo").text((board.playerNames[1] == null) ? "?????" : board.playerNames[1]);
	if(board.players[1]!=null) {
		if(board.winner!=undefined){
			$(".myTurn").hide();
			$(".notMyTurn").hide();
			$(".spectator").show();
			$(".join").hide();
		} else {
			if(board.players[board.playerTurn] == board.whoCalled) {
				$(".myTurn").show();
				$(".notMyTurn").hide();
				$(".spectator").hide();
				$(".join").hide();
			} else if(board.players[(board.playerTurn+1)%2] == board.whoCalled) {
				$(".myTurn").hide();
				$(".notMyTurn").show();
				$(".spectator").hide();
				$(".join").hide();
			} else {
				$(".myTurn").hide();
				$(".notMyTurn").hide();
				$(".spectator").show();
				$(".join").hide();
			}
		}
	} else {
		$(".linkToGame").show();
		$("#joinLink").val(window.location.href);
		$(".myTurn").hide();
		$(".notMyTurn").hide();
		$(".spectator").hide();
		$(".join").hide();
		if(board.players[0] != board.whoCalled) { // That's a new player, ask him if he want to join!
			$(".linkToGame").hide();
			$(".joinButton").show();
			$(".join").show();
		}
	}

	for(var i=0; i<board.bar.length; i++) {
		if(board.bar[i]!=null) {
			$(".bar-"+i+"").addClass("selected");
		}
	}
	for(var i=0; i<board.squares.length; i++) {
		if(board.squares[i]==0) {
			$(".square-"+i+"").addClass("player-1");
		}
		if(board.squares[i]==1) {
			$(".square-"+i+"").addClass("player-2");
		}
	}
}

// Get data
function getListOfGames() {
	nebPay.simulateCall(contract_address, 0, "getListOfGames", "", {
		qrcode: {
			showQRCode: false
		},
		callback:  callbackUrl,
		listener: onGameList  //set listener for extension transaction result
	});
}

function onGameList(resp) {
	var data = JSON.parse(resp.result);
	console.log(data);
}

function createTable(size) {
	var elements = (size*2)+1;
	$("#game").empty();
	$("#game").height(size*100);
	$("#game").width(size*100);

	//$("#game2").append("<tbody></tbody>");
	var barCounter = 0;
	var squareCounter = 0;
	for(var i=0; i<elements; i++) {
		$("#game").append('<tr class="tr-'+i+'"></tr>')

		for(var j=0; j<elements; j++) {
			if(i%2==0) {
				if(j%2==0) {
					$(".tr-"+i).append('<td class="edge"></td>');
				} else {
					$(".tr-"+i).append('<td class="bar bar-'+barCounter+'" onclick="javascript:onBarClick(this)" number="'+barCounter+'"></td>');
					barCounter++;
				}
			} else {
				if(j%2==0) {
					$(".tr-"+i).append('<td class="bar bar-'+barCounter+'" onclick="javascript:onBarClick(this)" number="'+barCounter+'"></td>');
					barCounter++;
				} else {
					$(".tr-"+i).append('<td class="square square-'+squareCounter+'"></td>');
					squareCounter++
				}
			}
		}
	}
}

function canPlay() {
	return (lastBoard.players[1] != null && lastBoard.players[lastBoard.playerTurn] == lastBoard.whoCalled)
}