#include <iostream>
using namespace std;
string encrypt(string text, int key) {
    string result = "";

    for (char ch : text) {
        if (isupper(ch))
            result += char((ch - 'A' + key) % 26 + 'A');
        else if (islower(ch))
            result += char((ch - 'a' + key) % 26 + 'a');
        else
            result += ch; 
    }

    return result;
}

int main() {
    string text;
    int key;

    cout << "Enter the text: ";
    getline(cin, text);

    cout << "Enter the key (shift value): ";
    cin >> key;

    string encrypted = encrypt(text, key);
    cout << "\nEncrypted Text: " << encrypted << endl;


    return 0;
}
