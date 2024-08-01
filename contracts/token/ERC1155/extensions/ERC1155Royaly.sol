// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "../ERC1155.sol";
import {ERC2981} from "../../common/ERC2981.sol";

/**
 * @dev Extension of ERC-1155 with the ERC-2981 NFT Royalty Standard, a standardized way to retrieve royalty payment
 * information.
 *
 * Royalty information can be specified globally for all token ids via {ERC2981-_setDefaultRoyalty}, and/or individually
 * for specific token ids via {ERC2981-_setTokenRoyalty}. The latter takes precedence over the first.
 *
 * IMPORTANT: ERC-2981 only specifies a way to signal royalty information and does not enforce its payment. See
 * https://eips.ethereum.org/EIPS/eip-2981#optional-royalty-payments[Rationale] in the ERC. Marketplaces are expected to
 * voluntarily pay royalties together with sales, but note that this standard is not yet widely supported.
 */
abstract contract ERC1155Royalty is ERC2981, ERC1155 {
    /**
     * @dev Emitted when `value` amount of tokens of type `id` are transferred from `from` to `to` by `operator` and also sets the `royalty` for each token `id`.
     */
    event TransferBatchWithRoyaltiesSet(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values,
        uint96[] royalties
    );

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {ERC2981-setTokenRoyalty} and {ERC1155-mintBatch}
     *
     * Emits a {TransferBatch} event.
     * Emits a {TransferBatchWithRoyaltiesSet} event.
     *
     * Requirements:
     *
     * - `receiver` cannot be the zero address.
     * - `ids`, `values` `royalties` must have the same length.
     * - `royalties` values cannot be greater than the fee denominator.
     * - `to` cannot be the zero address.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     */
    function _mintBatchWithRoyalties(
        address receiver,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        uint96[] memory royalties,
        bytes memory data
    ) internal {
        if (ids.length != royalties.length) {
            revert ERC1155InvalidArrayLength(ids.length, royalties.length);
        }

        for (uint256 i = 0; i < ids.length; ++i) {
            _setTokenRoyalty(ids[i], receiver, royalties[i]);
        }

        super._mintBatch(to, ids, values, data);
        emit TransferBatchWithRoyaltiesSet(_msgSender(), address(0), to, ids, values, royalties);
    }
}
