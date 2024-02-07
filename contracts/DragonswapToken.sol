// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MyToken is ERC20, ERC20Burnable, ERC20Permit {
    constructor(address treasury) ERC20("Dragonswap Token", "DST") ERC20Permit("Dragonswap") {
        require(treasury != address(0));
        _mint(treasury, 1_000_000 * 1e18);
    }
}
