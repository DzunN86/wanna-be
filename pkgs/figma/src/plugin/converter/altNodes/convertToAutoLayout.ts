// import { mostFrequent } from "./../swiftui/swiftuiMain";
import {AltFrameNode, AltGroupNode, AltSceneNode} from './altMixins';
import {convertGroupToFrame} from './convertGroupToFrame';

/**
 * Add AutoLayout attributes if layout has items aligned (either vertically or horizontally).
 * To make the calculation, the average position of every child, ordered, needs to pass a threshold.
 * If it fails for both X and Y axis, there is no AutoLayout and return it unchanged.
 * If it finds, add the correct attributes. When original node is a Group,
 * convert it to Frame before adding the attributes. Group doesn't have AutoLayout properties.
 */
export const convertToAutoLayout = (node: AltFrameNode | AltGroupNode): AltFrameNode | AltGroupNode => {
    // only go inside when AutoLayout is not already set.

    if (('layoutMode' in node && node.layoutMode === 'NONE' && node.children.length > 0) || node.type === 'GROUP') {
        const [orderedChildren, direction, itemSpacing] = reorderChildrenIfAligned(node.children);
        node.children = orderedChildren;

        if (direction === 'NONE' && node.children.length > 1) {
            node.isRelative = true;
        }

        if (direction === 'NONE' && node.children.length !== 1) {
            // catches when children is 0 or children is larger than 1
            return node;
        }

        // if node is a group, convert to frame
        if (node.type === 'GROUP') {
            node = convertGroupToFrame(node);
        }

        if (direction === 'NONE' && node.children.length === 1) {
            // Add fake AutoLayout when there is a single item. This is done for the Padding.
            node.layoutMode = 'HORIZONTAL';
        } else {
            node.layoutMode = direction;
        }

        node.itemSpacing = itemSpacing > 0 ? itemSpacing : 0;

        const padding = detectAutoLayoutPadding(node);

        node.paddingTop = Math.max(padding.top, 0);
        node.paddingBottom = Math.max(padding.bottom, 0);
        node.paddingLeft = Math.max(padding.left, 0);
        node.paddingRight = Math.max(padding.right, 0);

        // set children to INHERIT or STRETCH
        node.children.map((d) => {
            // @ts-ignore current node can't be AltGroupNode because it was converted into AltFrameNode
            layoutAlignInChild(d, node);
        });

        // const allChildrenDirection = node.children.map((d) =>
        //     // @ts-ignore current node can't be AltGroupNode because it was converted into AltFrameNode
        //     primaryAxisDirection(d, node)
        // );

        // const primaryDirection = allChildrenDirection.map((d) => d.primary);
        // const counterDirection = allChildrenDirection.map((d) => d.counter);

        // @ts-ignore it is never going to be undefined.
        // node.primaryAxisAlignItems = mostFrequent(primaryDirection);
        // @ts-ignore it is never going to be undefined.
        // node.counterAxisAlignItems = mostFrequent(counterDirection);

        node.counterAxisSizingMode = 'FIXED';
        node.primaryAxisSizingMode = 'FIXED';
    }

    return node;
};

/**
 * Standard average calculation. Length must be > 0
 */
const average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length;

/**
 * Check the average of children positions against this threshold;
 * This allows a small tolerance, which is useful when items are slightly overlayed.
 * If you set this lower, layouts will get more responsive but with less visual fidelity.
 */
const threshold = -2;

/**
 * Verify if children are sorted by their relative position and return them sorted, if identified.
 */
const reorderChildrenIfAligned = (
    children: ReadonlyArray<AltSceneNode>
): [Array<AltSceneNode>, 'HORIZONTAL' | 'VERTICAL' | 'NONE', number] => {
    if (children.length === 1) {
        return [[...children], 'NONE', 0];
    }

    const updateChildren = [...children];
    const [visit, avg] = shouldVisit(updateChildren);

    // check against a threshold
    if (visit === 'VERTICAL') {
        // if all elements are horizontally aligned
        return [updateChildren.sort((a, b) => a.y - b.y), 'VERTICAL', avg];
    } else {
        if (visit === 'HORIZONTAL') {
            // if all elements are vertically aligned
            return [updateChildren.sort((a, b) => a.x - b.x), 'HORIZONTAL', avg];
        }
    }

    return [updateChildren, 'NONE', 0];
};

/**
 * Checks if layout is horizontally or vertically aligned.
 * First verify if all items are vertically aligned in Y axis (spacing > 0), then for X axis, then the average for Y and finally the average for X.
 * If no correspondence is found, returns "NONE".
 * In a previous version, it used a "standard deviation", but "average" performed better.
 */
const shouldVisit = (children: ReadonlyArray<AltSceneNode>): ['HORIZONTAL' | 'VERTICAL' | 'NONE', number] => {
    const intervalY = calculateInterval(children, 'y');
    const intervalX = calculateInterval(children, 'x');

    const avgX = average(intervalX);
    const avgY = average(intervalY);

    if (!intervalY.every((d) => d >= threshold)) {
        if (!intervalX.every((d) => d >= threshold)) {
            if (avgY <= threshold) {
                if (avgX <= threshold) {
                    return ['NONE', 0];
                }
                return ['HORIZONTAL', avgX];
            }
            return ['VERTICAL', avgY];
        }
        return ['HORIZONTAL', avgX];
    }
    return ['VERTICAL', avgY];
};

// todo improve this method to try harder. Idea: maybe use k-means or hierarchical cluster?

/**
 * This function calculates the distance (interval) between items.
 * Example: for [item]--8--[item]--8--[item], the result is [8, 8]
 */
const calculateInterval = (children: ReadonlyArray<AltSceneNode>, xOrY: 'x' | 'y'): Array<number> => {
    const hOrW: 'width' | 'height' = xOrY === 'x' ? 'width' : 'height';

    // sort children based on X or Y values
    const sorted: Array<AltSceneNode> = [...children].sort((a, b) => a[xOrY] - b[xOrY]);

    // calculate the distance between values (either vertically or horizontally)
    const interval = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        interval.push(sorted[i + 1][xOrY] - (sorted[i][xOrY] + sorted[i][hOrW]));
    }
    return interval;
};

/**
 * Calculate the Padding.
 * This is very verbose, but also more performant than calculating them independently.
 */
const detectAutoLayoutPadding = (
    node: AltFrameNode
): {
    left: number;
    right: number;
    top: number;
    bottom: number;
} => {
    // this need to be run before VERTICAL or HORIZONTAL
    if (node.children.length === 1) {
        // left padding is first element's y value
        const left = node.children[0].x;

        const right = node.width - (node.children[0].x + node.children[0].width);

        const top = node.children[0].y;

        const bottom = node.height - (node.children[0].y + node.children[0].height);

        // return the smallest padding in each axis
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
        };
    } else if (node.layoutMode === 'VERTICAL') {
        // top padding is first element's y value
        const top = node.children[0].y;

        // bottom padding is node height - last position + last height
        const last = node.children[node.children.length - 1];
        const bottom = node.height - (last.y + last.height);

        // the closest value to the left border
        const left = Math.min(...node.children.map((d) => d.x));

        // similar to [bottom] calculation, but using height and getting the minimum
        const right = Math.min(...node.children.map((d) => node.width - (d.width + d.x)));

        // return the smallest padding in each axis
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
        };
    } else {
        // node.layoutMode === "HORIZONTAL"

        // left padding is first element's y value
        const left = node.children[0].x;

        // right padding is node width - last position + last width
        const last = node.children[node.children.length - 1];
        const right = node.width - (last.x + last.width);

        // the closest value to the top border
        const top = Math.min(...node.children.map((d) => d.y));

        // similar to [right] calculation, but using height and getting the minimum
        const bottom = Math.min(...node.children.map((d) => node.height - (d.height + d.y)));

        // return the smallest padding in each axis
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
        };
    }
};

/**
 * Detect if children stretch or inherit.
 */
const layoutAlignInChild = (node: AltSceneNode, parentNode: AltFrameNode) => {
    const sameWidth = node.width - 2 > parentNode.width - parentNode.paddingLeft - parentNode.paddingRight;

    const sameHeight = node.height - 2 > parentNode.height - parentNode.paddingTop - parentNode.paddingBottom;

    if (parentNode.layoutMode === 'VERTICAL') {
        node.layoutAlign = sameWidth ? 'STRETCH' : 'INHERIT';
    } else {
        node.layoutAlign = sameHeight ? 'STRETCH' : 'INHERIT';
    }
    // with custom AutoLayout, this is never going to be 1.
    node.layoutGrow = 0;
};

// const primaryAxisDirection = (
//     node: AltSceneNode,
//     parentNode: AltFrameNode
// ): {primary: 'MIN' | 'CENTER' | 'MAX'; counter: 'MIN' | 'CENTER' | 'MAX'} => {
//     // parentNode.layoutMode can't be NONE.
//     const nodeCenteredPosX = node.x + node.width / 2;
//     const parentCenteredPosX = parentNode.width / 2;

//     const centerXPosition = nodeCenteredPosX - parentCenteredPosX;

//     const nodeCenteredPosY = node.y + node.height / 2;
//     const parentCenteredPosY = parentNode.height / 2;

//     const centerYPosition = nodeCenteredPosY - parentCenteredPosY;

//     if (parentNode.layoutMode === 'VERTICAL') {
//         return {
//             primary: getPaddingDirection(centerYPosition),
//             counter: getPaddingDirection(centerXPosition),
//         };
//     } else {
//         return {
//             primary: getPaddingDirection(centerXPosition),
//             counter: getPaddingDirection(centerYPosition),
//         };
//     }
// };

// const getPaddingDirection = (position: number): 'MIN' | 'CENTER' | 'MAX' => {
//     // allow a small threshold
//     if (position < -4) {
//         return 'MIN';
//     } else if (position > 4) {
//         return 'MAX';
//     } else {
//         return 'CENTER';
//     }
// };
