pragma solidity =0.5.16;

import '../DragonswapERC20.sol';

contract ERC20 is DragonswapERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
