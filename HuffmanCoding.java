import java.util.*;

class HuffmanNode {
    char character;
    int frequency;
    HuffmanNode left, right;

    HuffmanNode(char character, int frequency) {
        this.character = character;
        this.frequency = frequency;
        this.left = this.right = null;
    }
}

public class HuffmanCoding {

    private static Map<Character, String> huffmanCodes = new HashMap<>();

    public static void main(String[] args) {
        String text = "Eighty six";
        System.out.println("Initial Text: " + text);

        // Step 1: Calculate frequency of each character
        Map<Character, Integer> frequencyMap = calculateFrequency(text);
        System.out.println("Character Frequencies: " + frequencyMap);

        // Step 2 & 3: Build Huffman Tree
        HuffmanNode root = buildHuffmanTree(frequencyMap);
        // Step 4: Generate Huffman Codes
        generateHuffmanCodes(root, "");
        System.out.println("Huffman Codes: " + huffmanCodes);

        // Step 5: Encode the text
        String encodedText = encodeText(text);
        System.out.println("Encoded Text: " + encodedText);

        // Step 6: Decode the text
        String decodedText = decodeText(encodedText, root);
        System.out.println("Decoded Text: " + decodedText);
    }

    private static Map<Character, Integer> calculateFrequency(String text) {
        Map<Character, Integer> frequencyMap = new HashMap<>();
        for (char c : text.toCharArray()) {
            frequencyMap.put(c, frequencyMap.getOrDefault(c, 0) + 1);
        }
        return frequencyMap;
    }

    private static HuffmanNode buildHuffmanTree(Map<Character, Integer> frequencyMap) {
        List<HuffmanNode> nodeList = new ArrayList<>();

        for (Map.Entry<Character, Integer> entry : frequencyMap.entrySet()) {
            nodeList.add(new HuffmanNode(entry.getKey(), entry.getValue()));
        }

        while (nodeList.size() > 1) {
            nodeList.sort(Comparator.comparingInt(node -> node.frequency));

           
            HuffmanNode left = nodeList.remove(0);
            HuffmanNode right = nodeList.remove(0);

            HuffmanNode parent = new HuffmanNode('\0', left.frequency + right.frequency);
            parent.left = left;
            parent.right = right;

            nodeList.add(parent);
        }
        return nodeList.get(0);
    }

    private static void generateHuffmanCodes(HuffmanNode node, String code) {
        if (node == null) return;

        if (node.left == null && node.right == null) {
            huffmanCodes.put(node.character, code);
        }

        generateHuffmanCodes(node.left, code + "0");
        generateHuffmanCodes(node.right, code + "1");
    }

    private static String encodeText(String text) {
        StringBuilder encodedText = new StringBuilder();
        for (char c : text.toCharArray()) {
            encodedText.append(huffmanCodes.get(c));
        }
        return encodedText.toString();
    }

    private static String decodeText(String encodedText, HuffmanNode root) {
        StringBuilder decodedText = new StringBuilder();
        HuffmanNode currentNode = root;

        for (char bit : encodedText.toCharArray()) {
            currentNode = (bit == '0') ? currentNode.left : currentNode.right;

            if (currentNode.left == null && currentNode.right == null) {
                decodedText.append(currentNode.character);
                currentNode = root;
            }
        }
        return decodedText.toString();
    }
}
