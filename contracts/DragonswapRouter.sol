pragma solidity =0.6.6;

import './libraries/TransferHelper.sol';
import './libraries/DragonswapLibrary.sol';
import './libraries/SafeMath.sol';

import './interfaces/IDragonswapRouter.sol';
import './interfaces/IDragonswapFactory.sol';
import './interfaces/IERC20.sol';
import './interfaces/IWSEI.sol';

contract DragonswapRouter is IDragonswapRouter {
    using SafeMath for uint;

    address public immutable override factory;
    address public immutable override WSEI;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'DragonswapRouter: EXPIRED');
        _;
    }

    constructor(address _factory, address _WSEI) public {
        factory = _factory;
        WSEI = _WSEI;
    }

    receive() external payable {
        assert(msg.sender == WSEI); // only accept SEI via fallback from the WSEI contract
    }

    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        // create the pair if it doesn't exist yet
        if (IDragonswapFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IDragonswapFactory(factory).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = DragonswapLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = DragonswapLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'DragonswapRouter: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = DragonswapLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'DragonswapRouter: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = DragonswapLibrary.pairFor(factory, tokenA, tokenB);
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IDragonswapPair(pair).mint(to);
    }
    function addLiquiditySEI(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountSEIMin,
        address to,
        uint deadline
    ) external virtual override payable ensure(deadline) returns (uint amountToken, uint amountSEI, uint liquidity) {
        (amountToken, amountSEI) = _addLiquidity(
            token,
            WSEI,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountSEIMin
        );
        address pair = DragonswapLibrary.pairFor(factory, token, WSEI);
        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        IWSEI(WSEI).deposit{value: amountSEI}();
        assert(IWSEI(WSEI).transfer(pair, amountSEI));
        liquidity = IDragonswapPair(pair).mint(to);
        // refund dust sei, if any
        if (msg.value > amountSEI) TransferHelper.safeTransferSEI(msg.sender, msg.value - amountSEI);
    }

    // **** REMOVE LIQUIDITY ****
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = DragonswapLibrary.pairFor(factory, tokenA, tokenB);
        IDragonswapPair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint amount0, uint amount1) = IDragonswapPair(pair).burn(to);
        (address token0,) = DragonswapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, 'DragonswapRouter: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'DragonswapRouter: INSUFFICIENT_B_AMOUNT');
    }
    function removeLiquiditySEI(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountSEIMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountToken, uint amountSEI) {
        (amountToken, amountSEI) = removeLiquidity(
            token,
            WSEI,
            liquidity,
            amountTokenMin,
            amountSEIMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, amountToken);
        IWSEI(WSEI).withdraw(amountSEI);
        TransferHelper.safeTransferSEI(to, amountSEI);
    }
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountA, uint amountB) {
        address pair = DragonswapLibrary.pairFor(factory, tokenA, tokenB);
        uint value = approveMax ? uint(-1) : liquidity;
        IDragonswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
    }
    function removeLiquiditySEIWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountSEIMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountToken, uint amountSEI) {
        address pair = DragonswapLibrary.pairFor(factory, token, WSEI);
        uint value = approveMax ? uint(-1) : liquidity;
        IDragonswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountToken, amountSEI) = removeLiquiditySEI(token, liquidity, amountTokenMin, amountSEIMin, to, deadline);
    }

    // **** REMOVE LIQUIDITY (supporting fee-on-transfer tokens) ****
    function removeLiquiditySEISupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountSEIMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountSEI) {
        (, amountSEI) = removeLiquidity(
            token,
            WSEI,
            liquidity,
            amountTokenMin,
            amountSEIMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, IERC20(token).balanceOf(address(this)));
        IWSEI(WSEI).withdraw(amountSEI);
        TransferHelper.safeTransferSEI(to, amountSEI);
    }
    function removeLiquiditySEIWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountSEIMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountSEI) {
        address pair = DragonswapLibrary.pairFor(factory, token, WSEI);
        uint value = approveMax ? uint(-1) : liquidity;
        IDragonswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        amountSEI = removeLiquiditySEISupportingFeeOnTransferTokens(
            token, liquidity, amountTokenMin, amountSEIMin, to, deadline
        );
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = DragonswapLibrary.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? DragonswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            IDragonswapPair(DragonswapLibrary.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = DragonswapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = DragonswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'DragonswapRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapExactSEIForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WSEI, 'DragonswapRouter: INVALID_PATH');
        amounts = DragonswapLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWSEI(WSEI).deposit{value: amounts[0]}();
        assert(IWSEI(WSEI).transfer(DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }
    function swapTokensForExactSEI(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WSEI, 'DragonswapRouter: INVALID_PATH');
        amounts = DragonswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'DragonswapRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWSEI(WSEI).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferSEI(to, amounts[amounts.length - 1]);
    }
    function swapExactTokensForSEI(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WSEI, 'DragonswapRouter: INVALID_PATH');
        amounts = DragonswapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWSEI(WSEI).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferSEI(to, amounts[amounts.length - 1]);
    }
    function swapSEIForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WSEI, 'DragonswapRouter: INVALID_PATH');
        amounts = DragonswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, 'DragonswapRouter: EXCESSIVE_INPUT_AMOUNT');
        IWSEI(WSEI).deposit{value: amounts[0]}();
        assert(IWSEI(WSEI).transfer(DragonswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        // refund dust eth, if any
        if (msg.value > amounts[0]) TransferHelper.safeTransferSEI(msg.sender, msg.value - amounts[0]);
    }

    // **** SWAP (supporting fee-on-transfer tokens) ****
    // requires the initial amount to have already been sent to the first pair
    function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = DragonswapLibrary.sortTokens(input, output);
            IDragonswapPair pair = IDragonswapPair(DragonswapLibrary.pairFor(factory, input, output));
            uint amountInput;
            uint amountOutput;
            { // scope to avoid stack too deep errors
            (uint reserve0, uint reserve1,) = pair.getReserves();
            (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
            amountOutput = DragonswapLibrary.getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            address to = i < path.length - 2 ? DragonswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) {
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactSEIForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        payable
        ensure(deadline)
    {
        require(path[0] == WSEI, 'DragonswapRouter: INVALID_PATH');
        uint amountIn = msg.value;
        IWSEI(WSEI).deposit{value: amountIn}();
        assert(IWSEI(WSEI).transfer(DragonswapLibrary.pairFor(factory, path[0], path[1]), amountIn));
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactTokensForSEISupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        ensure(deadline)
    {
        require(path[path.length - 1] == WSEI, 'DragonswapRouter: INVALID_PATH');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, DragonswapLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        _swapSupportingFeeOnTransferTokens(path, address(this));
        uint amountOut = IERC20(WSEI).balanceOf(address(this));
        require(amountOut >= amountOutMin, 'DragonswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWSEI(WSEI).withdraw(amountOut);
        TransferHelper.safeTransferSEI(to, amountOut);
    }

    // **** LIBRARY FUNCTIONS ****
    function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {
        return DragonswapLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountOut)
    {
        return DragonswapLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountIn)
    {
        return DragonswapLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint amountIn, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return DragonswapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint amountOut, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return DragonswapLibrary.getAmountsIn(factory, amountOut, path);
    }
}
