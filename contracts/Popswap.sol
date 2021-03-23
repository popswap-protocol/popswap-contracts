//SPDX-License-Identifier: GPL-3.0 License
pragma solidity >=0.7.0 <0.8.0;

import "hardhat/console.sol";

import "./SafeMath.sol";
import "./ReentrancyGuard.sol";
import "./simulators/ERC721/ERC721.sol";
import "./simulators/ERC1155/ERC1155.sol";

contract Popswap is ReentrancyGuard {
    using SafeMath for uint256;

    event TradeOpened(
        uint256 indexed tradeId,
        address indexed tradeOpener
    );

    event TradeCancelled(
        uint256 indexed tradeId,
        address indexed tradeCloser
    );

    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed tradeOpener,
        address indexed tradeCloser
    );

    struct Trade {
        uint256 tradeId;
        address openingTokenAddress;
        uint256 openingTokenId;
        // uint8 openingTokenType; // 0 for ERC771, 1 for ERC1155
        address closingTokenAddress;
        uint256 closingTokenId;
        // uint8 closingTokenType; // 0 for ERC771, 1 for ERC1155
        uint256 expiryDate;
        uint256 successDate;
        address tradeOpener;
        address tradeCloser;
        bool active;
    }

    Trade[] public trades;

    mapping (address => uint256[]) private _tradeOpenerToTradeIds;
    mapping (uint256 => address) private _tradeIdToTradeOpener;
    mapping (uint256 => address) private _tradeIdToTradeCloser;
  
    address private _devFund;

    constructor(address devFund_) {
        _devFund = devFund_;
    }

    function devFund() public view virtual returns (address) {
        return _devFund;
    }

    function openNewTrade(
        address _openingTokenAddress,
        uint256 _openingTokenId,
        // uint8 _openingTokenType,
        address _closingTokenAddress,
        uint256 _closingTokenId,
        // uint8 _closingTokenType,
        uint256 _expiryDate
    ) public nonReentrant returns (uint256) {
        require(
            _expiryDate > block.timestamp,
            "Popswap::openNewTrade: _expiryDate must be after current block.timestamp"
        );
        // require(
        //     _openingTokenType == 0 || _openingTokenType == 1,
        //     "Popswap::openNewTrade: _openingTokenType must be either 0 or 1"
        // );
        // require(
        //     _closingTokenType == 0 || _closingTokenType == 1,
        //     "Popswap::openNewTrade: _closingTokenType must be either 0 or 1"
        // );
        // if(_openingTokenType == 0) {
        //     ERC721 openingToken = ERC721(_openingTokenAddress);
        //     require(
        //         openingToken.ownerOf(_openingTokenId) == msg.sender,
        //         "Popswap::openNewTrade: ERC721 openingToken must be owned by tradeOpener"
        //     );
        // }else if(_openingTokenType == 1) {
        //     ERC1155 openingToken = ERC1155(_openingTokenAddress);
        //     require(
        //         openingToken.balanceOf(msg.sender, _openingTokenId) > 0,
        //         "Popswap::openNewTrade: ERC1155 openingToken must be owned by tradeOpener"
        //     );
        // }
        uint256 tradeId = trades.length;
        trades.push(Trade(
            tradeId, // uint256 tradeId;
            _openingTokenAddress, // address openingTokenAddress;
            _openingTokenId, // uint256 openingTokenId;
            // _openingTokenType, // uint8 openingTokenType; // 0 for ERC771, 1 for ERC1155
            _closingTokenAddress, // address closingTokenAddress;
            _closingTokenId,  // uint256 closingTokenId;
            // _closingTokenType, // uint8 closingTokenType; // 0 for ERC771, 1 for ERC1155
            _expiryDate, // uint256 expiryDate;
            0, // uint256 successDate;
            msg.sender, // address tradeOpener;
            0x0000000000000000000000000000000000000000, // address tradeCloser;
            true // bool active;
        ));
        _tradeOpenerToTradeIds[msg.sender].push(tradeId);
        _tradeIdToTradeOpener[tradeId] = msg.sender;
        emit TradeOpened(tradeId, msg.sender);
        return tradeId;
    }

    function getTradeByTradeId(uint256 _tradeId) public view returns(
        uint256,
        address,
        uint256,
        // uint8,
        address,
        uint256,
        // uint8,
        uint256,
        uint256,
        address,
        address,
        bool
    ) {
        Trade memory trade = trades[_tradeId];
        return(
            trade.tradeId,
            trade.openingTokenAddress,
            trade.openingTokenId,
            // trade.openingTokenType,
            trade.closingTokenAddress,
            trade.closingTokenId,
            // trade.closingTokenType,
            trade.expiryDate,
            trade.successDate,
            trade.tradeOpener,
            trade.tradeCloser,
            trade.active
        );
    }

    function getTradeCount() public view returns(uint256) {
        return trades.length;
    }

    function cancelTrade(
        uint256 _tradeId
    ) public {
        require(
            _tradeIdToTradeOpener[_tradeId] == msg.sender,
            "Popswap::cancelTrade: _tradeId must be trade created by msg.sender"
        );
        Trade memory trade = trades[_tradeId];
        require(
            trade.tradeCloser == 0x0000000000000000000000000000000000000000,
            "Popswap::cancelTrade: _tradeCloser can't already be non-zero address"
        );
        require(
            trade.successDate == 0,
            "Popswap::cancelTrade: successDate can't already be populated"
        );
        trades[_tradeId] = Trade(
            trade.tradeId,
            trade.openingTokenAddress,
            trade.openingTokenId,
            // trade.openingTokenType,
            trade.closingTokenAddress,
            trade.closingTokenId,
            // trade.closingTokenType,
            trade.expiryDate,
            trade.successDate,
            trade.tradeOpener,
            msg.sender,
            false
        );
        _tradeIdToTradeCloser[_tradeId] = msg.sender;
        emit TradeCancelled(trade.tradeId, msg.sender);
    }

    function isExchangeExecutable(uint256 _tradeId, uint8 _openingTokenType, uint8 _closingTokenType) public view returns (bool) {
        Trade memory trade = trades[_tradeId];
        if(trade.expiryDate < block.timestamp) {
            return false;
        }
        if(trade.active != true) {
            return false;
        }
        if(_openingTokenType == 0) {
            ERC721 openingToken = ERC721(trade.openingTokenAddress);
            if(openingToken.isApprovedForAll(trade.tradeOpener, address(this)) != true) {
                return false;
            }
            if(openingToken.ownerOf(trade.openingTokenId) != trade.tradeOpener) {
                return false;
            }
        }else if(_openingTokenType == 1) {
            ERC1155 openingToken = ERC1155(trade.openingTokenAddress);
            if(openingToken.isApprovedForAll(trade.tradeOpener, address(this)) != true) {
                return false;
            }
            if(openingToken.balanceOf(trade.tradeOpener, trade.openingTokenId) < 1) {
                return false;
            }
        }
        if(_closingTokenType == 0) {
            ERC721 closingToken = ERC721(trade.closingTokenAddress);
            if(closingToken.isApprovedForAll(msg.sender, address(this)) != true) {
                return false;
            }
            if(closingToken.balanceOf(msg.sender) < 1) {
                return false;
            }
        }else if(_closingTokenType == 1) {
            ERC1155 closingToken = ERC1155(trade.closingTokenAddress);
            if(closingToken.isApprovedForAll(msg.sender, address(this)) != true) {
                return false;
            }
            if(closingToken.balanceOf(msg.sender, trade.closingTokenId) < 1) {
                return false;
            }
        }
        return true;
    }

    function executeTrade(uint256 _tradeId, uint8 _openingTokenType, uint8 _closingTokenType) public nonReentrant returns (uint256) {
        Trade memory trade = trades[_tradeId];
        require(
            trade.active == true,
            "Popswap::executeTrade: trade is no longer active"
        );
        require(
            trade.expiryDate > block.timestamp,
            "Popswap::executeTrade: trade has expired"
        );
        if(_openingTokenType == 0) {
            ERC721 openingToken = ERC721(trade.openingTokenAddress);
            openingToken.transferFrom(trade.tradeOpener, msg.sender, trade.openingTokenId);
        }else if(_openingTokenType == 1) {
            ERC1155 openingToken = ERC1155(trade.openingTokenAddress);
            openingToken.safeTransferFrom(trade.tradeOpener, msg.sender, trade.openingTokenId, 1, "0000000000000000000000000000000000000000000000000000000000000000");
        }
        if(_closingTokenType == 0) {
            ERC721 closingToken = ERC721(trade.closingTokenAddress);
            closingToken.transferFrom(msg.sender, trade.tradeOpener, trade.closingTokenId);
        }else if(_closingTokenType == 1) {
            ERC1155 closingToken = ERC1155(trade.closingTokenAddress);
            closingToken.safeTransferFrom(msg.sender, trade.tradeOpener, trade.closingTokenId, 1, "0000000000000000000000000000000000000000000000000000000000000000");
        }
        trades[_tradeId] = Trade(
            trade.tradeId,
            trade.openingTokenAddress,
            trade.openingTokenId,
            // trade.openingTokenType,
            trade.closingTokenAddress,
            trade.closingTokenId,
            // trade.closingTokenType,
            trade.expiryDate,
            block.timestamp,
            trade.tradeOpener,
            msg.sender,
            false
        );
        _tradeIdToTradeCloser[_tradeId] = msg.sender;
        emit TradeExecuted(trade.tradeId, trade.tradeOpener, msg.sender);
        return trade.tradeId;
    }
}
